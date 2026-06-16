import { Logger } from '../utils/logger';

export interface WhereCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';
  value?: unknown;
}

export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: { left: string; right: string };
}

export class QueryBuilder {
  private logger: Logger;
  private selectColumns: string[] = ['*'];
  private fromTable: string = '';
  private joins: JoinClause[] = [];
  private wheres: WhereCondition[] = [];
  private groups: string[] = [];
  private orders: OrderByClause[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('QueryBuilder');
  }

  select(columns: string | string[]): this {
    this.selectColumns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  from(table: string): this {
    this.fromTable = table;
    return this;
  }

  join(type: JoinClause['type'], table: string, leftColumn: string, rightColumn: string): this {
    this.joins.push({
      type,
      table,
      on: { left: leftColumn, right: rightColumn },
    });
    return this;
  }

  innerJoin(table: string, leftColumn: string, rightColumn: string): this {
    return this.join('INNER', table, leftColumn, rightColumn);
  }

  leftJoin(table: string, leftColumn: string, rightColumn: string): this {
    return this.join('LEFT', table, leftColumn, rightColumn);
  }

  where(column: string, operator: WhereCondition['operator'], value?: unknown): this {
    this.wheres.push({ column, operator, value });
    return this;
  }

  whereEquals(column: string, value: unknown): this {
    return this.where(column, '=', value);
  }

  whereNotEquals(column: string, value: unknown): this {
    return this.where(column, '!=', value);
  }

  whereLike(column: string, value: string): this {
    return this.where(column, 'LIKE', `%${value}%`);
  }

  whereIn(column: string, values: unknown[]): this {
    return this.where(column, 'IN', values);
  }

  whereNull(column: string): this {
    return this.where(column, 'IS NULL');
  }

  whereNotNull(column: string): this {
    return this.where(column, 'IS NOT NULL');
  }

  whereBetween(column: string, start: unknown, end: unknown): this {
    this.wheres.push({ column, operator: 'BETWEEN', value: [start, end] });
    return this;
  }

  orWhere(column: string, operator: WhereCondition['operator'], value?: unknown): this {
    this.wheres.push({ column, operator, value });
    return this;
  }

  groupBy(...columns: string[]): this {
    this.groups.push(...columns);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orders.push({ column, direction });
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  build(): string {
    const parts: string[] = [];

    parts.push(`SELECT ${this.selectColumns.join(', ')}`);
    parts.push(`FROM ${this.fromTable}`);

    if (this.joins.length > 0) {
      this.joins.forEach(join => {
        parts.push(`${join.type} JOIN ${join.table} ON ${join.on.left} = ${join.on.right}`);
      });
    }

    if (this.wheres.length > 0) {
      const whereClauses = this.wheres.map((where, index) => {
        const prefix = index > 0 && !where.column.startsWith('(') ? 'AND ' : '';
        
        if (where.operator === 'IS NULL' || where.operator === 'IS NOT NULL') {
          return `${prefix}${where.column} ${where.operator}`;
        }
        
        if (where.operator === 'IN' || where.operator === 'NOT IN') {
          const values = Array.isArray(where.value) 
            ? where.value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')
            : where.value;
          return `${prefix}${where.column} ${where.operator} (${values})`;
        }

        if (where.operator === 'BETWEEN' && Array.isArray(where.value)) {
          return `${prefix}${where.column} BETWEEN ${where.value[0]} AND ${where.value[1]}`;
        }

        const value = typeof where.value === 'string' ? `'${where.value}'` : where.value;
        return `${prefix}${where.column} ${where.operator} ${value}`;
      });
      parts.push(`WHERE ${whereClauses.join(' ')}`);
    }

    if (this.groups.length > 0) {
      parts.push(`GROUP BY ${this.groups.join(', ')}`);
    }

    if (this.orders.length > 0) {
      const orderClauses = this.orders.map(o => `${o.column} ${o.direction}`);
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    if (this.limitValue) {
      parts.push(`LIMIT ${this.limitValue}`);
    }

    if (this.offsetValue) {
      parts.push(`OFFSET ${this.offsetValue}`);
    }

    return parts.join(' ');
  }

  clone(): QueryBuilder {
    const builder = new QueryBuilder(this.logger);
    builder.selectColumns = [...this.selectColumns];
    builder.fromTable = this.fromTable;
    builder.joins = [...this.joins];
    builder.wheres = [...this.wheres];
    builder.groups = [...this.groups];
    builder.orders = [...this.orders];
    builder.limitValue = this.limitValue;
    builder.offsetValue = this.offsetValue;
    return builder;
  }
}

export class SqlGenerator {
  static insert(table: string, data: Record<string, unknown>): { sql: string; params: unknown[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    return {
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params: values,
    };
  }

  static update(table: string, data: Record<string, unknown>, where: Record<string, unknown>): { sql: string; params: unknown[] } {
    const setClauses = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClauses = Object.keys(where).map((key, i) => `${key} = $${Object.keys(data).length + i + 1}`).join(' AND ');
    
    return {
      sql: `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses}`,
      params: [...Object.values(data), ...Object.values(where)],
    };
  }

  static delete(table: string, where: Record<string, unknown>): { sql: string; params: unknown[] } {
    const whereClauses = Object.keys(where).map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    return {
      sql: `DELETE FROM ${table} WHERE ${whereClauses}`,
      params: Object.values(where),
    };
  }
}