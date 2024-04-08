import { replaceParams } from "./util.ts";

export class Join {
  value: string = "";
  constructor(type: string, readonly table: string, readonly alias?: string) {
    const name = alias ? "?? ??" : "??";
    this.value = replaceParams(`${type} ${name}`, [table, alias]);
  }

  static inner(table: string, alias?: string): Join {
    return new Join("INNER JOIN", table, alias);
  }

  static full(table: string, alias?: string): Join {
    return new Join("FULL OUTER JOIN", table, alias);
  }

  static left(table: string, alias?: string): Join {
    return new Join("LEFT OUTER JOIN", table, alias);
  }

  static right(table: string, alias?: string): Join {
    return new Join("RIGHT OUTER JOIN", table, alias);
  }

  on(a: string, b: string) {
    this.value += replaceParams(` ON ?? = ??`, [a, b]);
    return this;
  }
}
