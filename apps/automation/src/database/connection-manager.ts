import { Logger } from '../utils/logger';

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'sqlserver';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  sslMode?: string;
  connectionString?: string;
  pool?: {
    min: number;
    max: number;
  };
  timeout?: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields?: FieldInfo[];
  executionTime: number;
}

export interface FieldInfo {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export abstract class DatabaseClient {
  protected config: DatabaseConfig;
  protected logger: Logger;
  protected connected = false;

  constructor(config: DatabaseConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('DatabaseClient');
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  abstract execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  abstract beginTransaction(): Promise<Transaction>;
  abstract getSchema(): Promise<string[]>;
  abstract getTables(): Promise<string[]>;
  abstract getColumns(table: string): Promise<FieldInfo[]>;

  isConnected(): boolean {
    return this.connected;
  }

  protected getConnectionString(): string {
    if (this.config.connectionString) {
      return this.config.connectionString;
    }

    switch (this.config.type) {
      case 'postgresql':
        return `postgresql://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
      case 'mysql':
        return `mysql://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
      case 'mongodb':
        return `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
      case 'sqlserver':
        return `Server=${this.config.host},${this.config.port};Database=${this.config.database};User Id=${this.config.username};Password=${this.config.password};`;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }
}

export class ConnectionManager {
  private clients: Map<string, DatabaseClient> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ConnectionManager');
  }

  async connect(name: string, config: DatabaseConfig): Promise<DatabaseClient> {
    this.logger.info(`Connecting to ${config.type} database: ${name}`);

    let client: DatabaseClient;

    switch (config.type) {
      case 'postgresql':
        client = await this.createPostgresClient(config);
        break;
      case 'mysql':
        client = await this.createMySqlClient(config);
        break;
      case 'mongodb':
        client = await this.createMongoClient(config);
        break;
      case 'sqlserver':
        client = await this.createSqlServerClient(config);
        break;
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }

    await client.connect();
    this.clients.set(name, client);
    this.logger.info(`Connected to ${name}`);

    return client;
  }

  async disconnect(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
      this.logger.info(`Disconnected from ${name}`);
    }
  }

  async disconnectAll(): Promise<void> {
    const names = Array.from(this.clients.keys());
    await Promise.all(names.map(name => this.disconnect(name)));
  }

  getClient(name: string): DatabaseClient | undefined {
    return this.clients.get(name);
  }

  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(name: string): boolean {
    const client = this.clients.get(name);
    return client?.isConnected() || false;
  }

  private async createPostgresClient(config: DatabaseConfig): Promise<DatabaseClient> {
    const { PostgresClient } = await import('./postgresql.client');
    return new PostgresClient(config, this.logger);
  }

  private async createMySqlClient(config: DatabaseConfig): Promise<DatabaseClient> {
    const { MySqlClient } = await import('./mysql.client');
    return new MySqlClient(config, this.logger);
  }

  private async createMongoClient(config: DatabaseConfig): Promise<DatabaseClient> {
    const { MongoClient } = await import('./mongodb.client');
    return new MongoClient(config, this.logger);
  }

  private async createSqlServerClient(config: DatabaseConfig): Promise<DatabaseClient> {
    const { SqlServerClient } = await import('./sqlserver.client');
    return new SqlServerClient(config, this.logger);
  }
}