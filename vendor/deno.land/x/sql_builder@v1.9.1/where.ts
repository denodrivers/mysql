import { replaceParams } from "./util.ts";

/**
 * Where sub sql builder
 */
export class Where {
  private expr: string;
  private params: any[];
  constructor(expr: string, params: any[]) {
    this.expr = expr;
    this.params = params;
  }

  get value(): string {
    return this.toString();
  }

  toString(): string {
    return replaceParams(this.expr, this.params);
  }

  static expr(expr: string, ...params: any[]): Where {
    return new Where(expr, params);
  }

  static eq(field: string, value: any) {
    return this.expr("?? = ?", field, value);
  }

  /**
   * eq from object
   * @param data
   */
  static from(data: any): Where {
    const conditions = Object.keys(data).map((key) => this.eq(key, data[key]));
    return this.and(...conditions);
  }

  static gt(field: string, value: any) {
    return this.expr("?? > ?", field, value);
  }

  static gte(field: string, value: any) {
    return this.expr("?? >= ?", field, value);
  }

  static lt(field: string, value: any) {
    return this.expr("?? < ?", field, value);
  }

  static lte(field: string, value: any) {
    return this.expr("?? <= ?", field, value);
  }

  static ne(field: string, value: any) {
    return this.expr("?? != ?", field, value);
  }

  static isNull(field: string) {
    return this.expr("?? IS NULL", field);
  }

  static notNull(field: string) {
    return this.expr("?? NOT NULL", field);
  }

  static in(field: string, ...values: any[]) {
    const params: any[] = values.length > 1 ? values : values[0];
    return this.expr("?? IN ?", field, params);
  }

  static notIn(field: string, ...values: any[]) {
    const params: any[] = values.length > 1 ? values : values[0];
    return this.expr("?? NOT IN ?", field, params);
  }

  static like(field: string, value: any) {
    return this.expr("?? LIKE ?", field, value);
  }

  static between(field: string, startValue: any, endValue: any) {
    return this.expr("?? BETWEEN ? AND ?", field, startValue, endValue);
  }

  static field(name: string) {
    return {
      gt: (value: any) => this.gt(name, value),
      gte: (value: any) => this.gte(name, value),
      lt: (value: any) => this.lt(name, value),
      lte: (value: any) => this.lte(name, value),
      ne: (value: any) => this.ne(name, value),
      eq: (value: any) => this.eq(name, value),
      isNull: () => this.isNull(name),
      notNull: () => this.notNull(name),
      in: (...values: any[]) => this.in(name, ...values),
      notIn: (...values: any[]) => this.notIn(name, ...values),
      like: (value: any) => this.like(name, value),
      between: (start: any, end: any) => this.between(name, start, end),
    };
  }

  static and(...expr: (null | undefined | Where)[]): Where {
    const sql = `(${
      expr
        .filter((e) => e)
        .map((e) => e!.value)
        .join(" AND ")
    })`;
    return new Where(sql, []);
  }

  static or(...expr: (null | undefined | Where)[]): Where {
    const sql = `(${
      expr
        .filter((e) => e)
        .map((e) => e!.value)
        .join(" OR ")
    })`;
    return new Where(sql, []);
  }
}
