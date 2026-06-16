import { DatabaseClient, DatabaseConfig, QueryResult, Transaction, FieldInfo } from './connection-manager';
import { Logger } from '../utils/logger';

export class PostgresClient extends DatabaseClient {
  private pool: any = null;

  constructor(config: DatabaseConfig, logger?: Logger) {
    super(config, logger);
  }

  async connect(): Promise<void> {
    const { Pool } = await import('pg');
    
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.pool?.max || 20,
      min: this.config.pool?.min || 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: this.config.timeout || 2000,
    });

    const client = await this.pool.connect();
    client.release();
    this.connected = true;
    this.logger.info('PostgreSQL connected');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      this.logger.info('PostgreSQL disconnected');
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.pool.query(sql, params);
      
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
        fields: result.fields?.map((f: any) => ({
          name: f.name,
          dataType: f.dataTypeID.toString(),
          nullable: !f.notNull,
        })),
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
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
    } catch (error) {
      client.release();
      throw error;
    }

    return {
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      },
    };
  }

  async getSchema(): Promise<string[]> {
    const result = await this.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema')"
    );
    return result.rows.map((r: any) => r.schema_name);
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    return result.rows.map((r: any) => r.table_name);
  }

  async getColumns(table: string): Promise<FieldInfo[]> {
    const result = await this.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = $1`,
      [table]
    );
    return result.rows.map((r: any) => ({
      name: r.column_name,
      dataType: r.data_type,
      nullable: r.is_nullable === 'YES',
    }));
  }

  async upsert(table: string, data: Record<string, unknown>, conflictColumn: string): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const setClause = columns.map((col, _i) => `${col} = EXCLUDED.${col}`).join(', ');
    
    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumn}) DO UPDATE SET ${setClause}
    `;
    
    const result = await this.query(sql, values);
    return result.rowCount;
  }

  async bulkInsert(table: string, data: Record<string, unknown>[]): Promise<number> {
    if (data.length === 0) return 0;

    const columns = Object.keys(data[0]);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    data.forEach((row, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ');
      placeholders.push(`(${rowPlaceholders})`);
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
    const result = await this.query<{ count: string }>(sql);
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}