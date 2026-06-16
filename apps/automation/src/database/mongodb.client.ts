import { DatabaseClient, DatabaseConfig, QueryResult, FieldInfo } from './connection-manager';
import { Logger } from '../utils/logger';

interface MongoDocument {
  _id?: any;
  [key: string]: any;
}

export class MongoClient extends DatabaseClient {
  private client: any = null;
  private db: any = null;

  constructor(config: DatabaseConfig, logger?: Logger) {
    super(config, logger);
  }

  async connect(): Promise<void> {
    const { MongoClient: Mongo } = await import('mongodb');
    
    const uri = this.config.connectionString || 
      `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.database}`;
    
    this.client = new Mongo(uri, {
      maxPoolSize: this.config.pool?.max || 10,
      minPoolSize: this.config.pool?.min || 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await this.client.connect();
    this.db = this.client.db(this.config.database);
    this.connected = true;
    this.logger.info('MongoDB connected');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
      this.logger.info('MongoDB disconnected');
    }
  }

  async query<T = unknown>(_sql: string, _params?: unknown[]): Promise<QueryResult<T>> {
    throw new Error('MongoDB does not support SQL queries. Use collection methods instead.');
  }

  async execute(_sql: string, _params?: unknown[]): Promise<{ affectedRows: number }> {
    throw new Error('MongoDB does not support SQL execution. Use collection methods instead.');
  }

  async beginTransaction(): Promise<{ commit(): Promise<void>; rollback(): Promise<void> }> {
    const session = this.client.startSession();
    session.startTransaction();

    return {
      commit: async () => {
        await session.commitTransaction();
        session.endSession();
      },
      rollback: async () => {
        await session.abortTransaction();
        session.endSession();
      },
    };
  }

  async getSchema(): Promise<string[]> {
    return this.db.listCollections().toArray().then((cols: any) => cols.map((c: any) => c.name));
  }

  async getTables(): Promise<string[]> {
    return this.getSchema();
  }

  async getColumns(collection: string): Promise<FieldInfo[]> {
    const sample = await this.db.collection(collection).findOne({});
    if (!sample) return [];

    const sampleDoc = sample as MongoDocument;
    return Object.keys(sampleDoc).map(key => ({
      name: key,
      dataType: this.getMongoType(sampleDoc[key]),
      nullable: true,
    }));
  }

  private getMongoType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    return typeof value;
  }

  async find<T = MongoDocument>(
    collection: string, 
    filter: Record<string, unknown> = {},
    options?: { limit?: number; skip?: number; sort?: Record<string, 1 | -1>; projection?: Record<string, 0 | 1> }
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const cursor = this.db.collection(collection).find(filter, options);

    if (options?.sort) cursor.sort(options.sort);
    if (options?.skip) cursor.skip(options.skip);
    if (options?.limit) cursor.limit(options.limit);

    const rows = await cursor.toArray();
    const count = await this.db.collection(collection).countDocuments(filter);

    return {
      rows: rows as T[],
      rowCount: count,
      executionTime: Date.now() - startTime,
    };
  }

  async findOne<T = MongoDocument>(collection: string, filter: Record<string, unknown>): Promise<T | null> {
    return this.db.collection(collection).findOne(filter);
  }

  async insert<T = MongoDocument>(collection: string, document: T): Promise<string> {
    const result = await this.db.collection(collection).insertOne(document);
    return result.insertedId.toString();
  }

  async insertMany<T = MongoDocument>(collection: string, documents: T[]): Promise<string[]> {
    const result = await this.db.collection(collection).insertMany(documents);
    return Object.values(result.insertedIds).map((id: any) => id.toString());
  }

  async updateOne(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<number> {
    const result = await this.db.collection(collection).updateOne(filter, update);
    return result.modifiedCount;
  }

  async updateMany(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<number> {
    const result = await this.db.collection(collection).updateMany(filter, update);
    return result.modifiedCount;
  }

  async upsert(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): Promise<number> {
    const result = await this.db.collection(collection).updateOne(filter, update, { upsert: true });
    return result.modifiedCount || result.upsertedCount || 0;
  }

  async deleteOne(collection: string, filter: Record<string, unknown>): Promise<number> {
    const result = await this.db.collection(collection).deleteOne(filter);
    return result.deletedCount;
  }

  async deleteMany(collection: string, filter: Record<string, unknown>): Promise<number> {
    const result = await this.db.collection(collection).deleteMany(filter);
    return result.deletedCount;
  }

  async aggregate<T = MongoDocument>(collection: string, pipeline: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const rows = await this.db.collection(collection).aggregate(pipeline).toArray();
    
    return {
      rows: rows as T[],
      rowCount: rows.length,
      executionTime: Date.now() - startTime,
    };
  }

  async count(collection: string, filter: Record<string, unknown> = {}): Promise<number> {
    return this.db.collection(collection).countDocuments(filter);
  }

  async distinct<T = unknown>(collection: string, field: string, filter: Record<string, unknown> = {}): Promise<T[]> {
    return this.db.collection(collection).distinct(field, filter);
  }
}