import { DatabaseClient, DatabaseConfig, QueryResult, Transaction, FieldInfo } from './connection-manager';
import { Logger } from '../utils/logger';

export class MySqlClient extends DatabaseClient {
  private pool: any = null;

  constructor(config: DatabaseConfig, logger?: Logger) {
    super(config, logger);
  }

  async connect(): Promise<void> {
    const mysql = await import('mysql2/promise');
    
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: this.config.pool?.max || 10,
      queueLimit: 0,
    });

    const connection = await this.pool.getConnection();
    connection.release();
    this.connected = true;
    this.logger.info('MySQL connected');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      this.logger.info('MySQL disconnected');
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const [rows, fields] = await this.pool.query(sql, params);
      
      const fieldInfos: FieldInfo[] = (fields as any[])?.map((f: any) => ({
        name: f.name,
        dataType: f.type,
        nullable: !f.notNull,
      })) || [];

      return {
        rows: Array.isArray(rows) ? rows as T[] : [],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        fields: fieldInfos,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Query failed: ${error}`);
      throw error;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }> {
    const result = await this.query(sql, params);
    return { affectedRows: result.rowCount };
  }

  async beginTransaction(): Promise<Transaction> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
    } catch (error) {
      connection.release();
      throw error;
    }

    return {
      commit: async () => {
        await connection.commit();
        connection.release();
      },
      rollback: async () => {
        await connection.rollback();
        connection.release();
      },
    };
  }

  async getSchema(): Promise<string[]> {
    const result = await this.query("SHOW DATABASES");
    return result.rows
      .map((r: any) => r.Database)
      .filter((db: string) => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db));
  }

  async getTables(): Promise<string[]> {
    const result = await this.query('SHOW TABLES');
    const key = `Tables_in_${this.config.database}`;
    return result.rows.map((r: any) => r[key]);
  }

  async getColumns(table: string): Promise<FieldInfo[]> {
    const result = await this.query(`DESCRIBE ${table}`);
    return result.rows.map((r: any) => ({
      name: r.Field,
      dataType: r.Type,
      nullable: r.Null === 'YES',
    }));
  }

  async upsert(table: string, data: Record<string, unknown>, _conflictColumn: string): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    const setClause = columns.map(col => `${col} = VALUES(${col})`).join(', ');
    
    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${setClause}
    `;
    
    const result = await this.query(sql, values);
    return result.rowCount;
  }

  async bulkInsert(table: string, data: Record<string, unknown>[]): Promise<number> {
    if (data.length === 0) return 0;

    const columns = Object.keys(data[0]);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    data.forEach((row) => {
      placeholders.push(`(${columns.map(() => '?').join(', ')})`);
      values.push(...Object.values(row));
    });

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`;
    const result = await this.query(sql, values);
    return result.rowCount;
  }

  async count(table: string, where?: string): Promise<number> {
    const sql = where 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}` 
      : `SELECT COUNT(*) as count FROM ${table}`;
    const result = await this.query<{ count: number }>(sql);
    return result.rows[0]?.count || 0;
  }

  async showCreateTable(table: string): Promise<string> {
    const result = await this.query<{ 'Create Table': string }>(`SHOW CREATE TABLE ${table}`);
    return result.rows[0]?.['Create Table'] || '';
  }
}