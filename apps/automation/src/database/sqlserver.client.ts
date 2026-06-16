import { DatabaseClient, DatabaseConfig, QueryResult, Transaction, FieldInfo } from './connection-manager';
import { Logger } from '../utils/logger';

export class SqlServerClient extends DatabaseClient {
  private pool: any = null;

  constructor(config: DatabaseConfig, logger?: Logger) {
    super(config, logger);
  }

  async connect(): Promise<void> {
    const mssql = await import('mssql');
    
    const pool = await mssql.connect({
      server: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      pool: {
        max: this.config.pool?.max || 10,
        min: this.config.pool?.min || 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        encrypt: this.config.ssl || false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    });

    this.pool = pool;
    this.connected = true;
    this.logger.info('SQL Server connected');
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.connected = false;
      this.logger.info('SQL Server disconnected');
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      const request = this.pool.request();
      
      if (params) {
        params.forEach((param, index) => {
          request.input(`p${index + 1}`, param);
        });
      }

      const result = await request.query(sql);
      
      return {
        rows: result.recordset as T[],
        rowCount: result.rowsAffected[0] || 0,
        fields: result.recordset?.length > 0 ? Object.keys(result.recordset[0]).map(name => ({
          name,
          dataType: 'unknown',
          nullable: true,
        })) : [],
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
    const transaction = new (await import('mssql')).Transaction(this.pool);
    await transaction.begin();

    return {
      commit: async () => {
        await transaction.commit();
      },
      rollback: async () => {
        await transaction.rollback();
      },
    };
  }

  async getSchema(): Promise<string[]> {
    const result = await this.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('INFORMATION_SCHEMA', 'sys', 'guest')
    `);
    return result.rows.map((r: any) => r.schema_name);
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'
    `);
    return result.rows.map((r: any) => r.TABLE_NAME);
  }

  async getColumns(table: string): Promise<FieldInfo[]> {
    const result = await this.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = 'dbo'
    `, [{ tableName: table }]);
    
    return result.rows.map((r: any) => ({
      name: r.COLUMN_NAME,
      dataType: r.DATA_TYPE,
      nullable: r.IS_NULLABLE === 'YES',
    }));
  }

  async upsert(table: string, data: Record<string, unknown>, conflictColumn: string): Promise<number> {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, i) => `@p${i + 1}`).join(', ');
    const setClause = columns.map(col => `${col} = @${col}`).join(', ');
    const params: any = { ...data };
    
    const sql = `
      MERGE INTO ${table} AS target
      USING (SELECT ${placeholders} AS values) AS source
      ON target.${conflictColumn} = source.${conflictColumn}
      WHEN MATCHED THEN
        UPDATE SET ${setClause}
      WHEN NOT MATCHED THEN
        INSERT (${columns.join(', ')}) VALUES (${placeholders});
    `;
    
    const result = await this.query(sql, params);
    return result.rowCount;
  }

  async bulkInsert(table: string, data: Record<string, unknown>[]): Promise<number> {
    if (data.length === 0) return 0;

    const columns = Object.keys(data[0]);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    data.forEach((row, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => `@p${rowIndex * columns.length + colIndex + 1}`).join(', ');
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
    const result = await this.query<{ count: number }>(sql);
    return result.rows[0]?.count || 0;
  }

  async executeStoredProc(procedure: string, params?: Record<string, unknown>): Promise<QueryResult> {
    const request = this.pool.request();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    return request.execute(procedure);
  }
}