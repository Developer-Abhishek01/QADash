import { test, expect } from '@playwright/test';
import { ConnectionManager, DatabaseConfig } from '../connection-manager';
import { DataComparator, DataValidator } from '../data-comparator';
import { QueryBuilder } from '../query-builder';
import { Logger } from '../../utils/logger';

const logger = new Logger('DatabaseTest');
const connectionManager = new ConnectionManager(logger);
const comparator = new DataComparator(logger);
const validator = new DataValidator(logger);

const dbConfig: DatabaseConfig = {
  type: (process.env.DB_TYPE as any) || 'postgresql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qadash',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true',
};

test.describe('PostgreSQL Database Tests', () => {
  let db: any;

  test.beforeAll(async () => {
    db = await connectionManager.connect('test-db', dbConfig);
  });

  test.afterAll(async () => {
    await connectionManager.disconnectAll();
  });

  test('should connect to database', async () => {
    expect(db.isConnected()).toBe(true);
  });

  test('should execute query and return results', async () => {
    const result = await db.query('SELECT 1 as num, \'test\' as str');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].num).toBe(1);
    expect(result.executionTime).toBeLessThan(1000);
  });

  test('should get list of tables', async () => {
    const tables = await db.getTables();
    expect(Array.isArray(tables)).toBe(true);
  });

  test('should get table columns', async () => {
    const tables = await db.getTables();
    if (tables.length > 0) {
      const columns = await db.getColumns(tables[0]);
      expect(Array.isArray(columns)).toBe(true);
    }
  });

  test('should insert and retrieve data', async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS test_users (id SERIAL PRIMARY KEY, name TEXT, email TEXT)`);
    
    await db.execute(
      `INSERT INTO test_users (name, email) VALUES ($1, $2) RETURNING id`,
      ['Test User', 'test@example.com']
    );
    
    const selectResult = await db.query('SELECT * FROM test_users WHERE email = $1', ['test@example.com']);
    expect(selectResult.rows).toHaveLength(1);
    expect(selectResult.rows[0].name).toBe('Test User');
    
    await db.execute('DROP TABLE IF EXISTS test_users');
  });

  test('should perform transaction with commit', async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS test_transactions (id SERIAL PRIMARY KEY, value TEXT)`);
    
    const tx = await db.beginTransaction();
    await tx.execute('INSERT INTO test_transactions (value) VALUES ($1)', ['tx1']);
    await tx.execute('INSERT INTO test_transactions (value) VALUES ($1)', ['tx2']);
    await tx.commit();
    
    const result = await db.query('SELECT COUNT(*) as count FROM test_transactions');
    expect(result.rows[0].count).toBe(2);
    
    await db.execute('DROP TABLE IF EXISTS test_transactions');
  });

  test('should perform transaction with rollback', async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS test_rollback (id SERIAL PRIMARY KEY, value TEXT)`);
    
    const tx = await db.beginTransaction();
    await tx.execute('INSERT INTO test_rollback (value) VALUES ($1)', ['should rollback']);
    await tx.rollback();
    
    const result = await db.query('SELECT COUNT(*) as count FROM test_rollback');
    expect(result.rows[0].count).toBe(0);
    
    await db.execute('DROP TABLE IF EXISTS test_rollback');
  });

  test('should use query builder', async () => {
    const query = new QueryBuilder(logger)
      .select(['id', 'name'])
      .from('users')
      .whereEquals('role', 'admin')
      .orderBy('name', 'ASC')
      .limit(10)
      .build();
    
    expect(query).toContain('SELECT id, name');
    expect(query).toContain('FROM users');
    expect(query).toContain('WHERE role =');
    expect(query).toContain('ORDER BY name ASC');
    expect(query).toContain('LIMIT 10');
  });

  test('should compare data', async () => {
    const expected = { id: 1, name: 'Test', active: true };
    const actual = { id: 1, name: 'Test', active: true };
    
    const result = comparator.compare(expected, actual);
    expect(result.equal).toBe(true);
  });

  test('should detect data differences', async () => {
    const expected = { id: 1, name: 'Test', active: true };
    const actual = { id: 1, name: 'Test', active: false };
    
    const result = comparator.compare(expected, actual);
    expect(result.equal).toBe(false);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0].type).toBe('modified');
  });

  test('should validate schema', async () => {
    const data = { name: 'Test', email: 'test@test.com', age: 25 };
    const schema = {
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      age: { type: 'integer', required: false },
    };
    
    const result = validator.validateSchema(data, schema);
    expect(result.valid).toBe(true);
  });

  test('should validate unique constraint', async () => {
    const values = [1, 2, 3, 2, 5];
    const result = validator.validateUnique(values);
    expect(result.valid).toBe(false);
    expect(result.duplicates).toContain(2);
  });

  test('should count rows', async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS test_count (id SERIAL PRIMARY KEY, value TEXT)`);
    await db.execute(`INSERT INTO test_count (value) VALUES ('a'), ('b'), ('c')`);
    
    const count = await db.count('test_count');
    expect(count).toBe(3);
    
    await db.execute('DROP TABLE IF EXISTS test_count');
  });

  test('should bulk insert', async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS test_bulk (id SERIAL PRIMARY KEY, value TEXT)`);
    
    const data = [
      { value: 'bulk1' },
      { value: 'bulk2' },
      { value: 'bulk3' },
    ];
    
    const inserted = await db.bulkInsert('test_bulk', data);
    expect(inserted).toBe(3);
    
    const count = await db.count('test_bulk');
    expect(count).toBe(3);
    
    await db.execute('DROP TABLE IF EXISTS test_bulk');
  });
});

test.describe('Data Comparator Tests', () => {
  test('should compare simple objects', () => {
    const result = comparator.compare({ a: 1, b: 2 }, { a: 1, b: 2 });
    expect(result.equal).toBe(true);
  });

  test('should detect added fields', () => {
    const result = comparator.compare({ a: 1 }, { a: 1, b: 2 });
    expect(result.equal).toBe(false);
    expect(result.differences[0].type).toBe('added');
  });

  test('should compare arrays', () => {
    const result = comparator.compare([1, 2, 3], [1, 2, 3]);
    expect(result.equal).toBe(true);
  });

  test('should detect array differences', () => {
    const result = comparator.compare([1, 2, 3], [1, 2, 4]);
    expect(result.equal).toBe(false);
    expect(result.summary.modified).toBe(1);
  });
});