import { assert, replaceParams } from "./deps.ts";
import { Order } from "./order.ts";
import { Where } from "./where.ts";
import { Join } from "./join.ts";

export class Query {
  private _type?: "select" | "insert" | "update" | "delete";
  private _table?: string;
  private _where: string[] = [];
  private _joins: string[] = [];
  private _orders: Order[] = [];
  private _fields: string[] = [];
  private _groupBy: string[] = [];
  private _having: string[] = [];
  private _insertValues: any[] = [];
  private _updateValue?: any;
  private _limit?: { start: number; size: number };

  private get orderSQL() {
    if (this._orders && this._orders.length) {
      return `ORDER BY ` + this._orders.map((order) => order.value).join(", ");
    }
  }

  private get whereSQL() {
    if (this._where && this._where.length) {
      return `WHERE ` + this._where.join(" AND ");
    }
  }

  private get havingSQL() {
    if (this._having && this._having.length) {
      return `HAVING ` + this._having.join(" AND ");
    }
  }

  private get joinSQL() {
    if (this._joins && this._joins.length) {
      return this._joins.join(" ");
    }
  }

  private get groupSQL() {
    if (this._groupBy && this._groupBy.length) {
      return (
        "GROUP BY " +
        this._groupBy.map((f) => replaceParams("??", [f])).join(", ")
      );
    }
  }
  private get limitSQL() {
    if (this._limit) {
      return `LIMIT ${this._limit.start}, ${this._limit.size}`;
    }
  }

  private get selectSQL() {
    return [
      "SELECT",
      this._fields.join(", "),
      "FROM",
      replaceParams("??", [this._table]),
      this.joinSQL,
      this.whereSQL,
      this.groupSQL,
      this.havingSQL,
      this.orderSQL,
      this.limitSQL,
    ]
      .filter((str) => str)
      .join(" ");
  }

  private get insertSQL() {
    const len = this._insertValues.length;
    const fields = Object.keys(this._insertValues[0]);
    const values = this._insertValues.map((row) => {
      return fields.map((key) => row[key]!);
    });
    return replaceParams(`INSERT INTO ?? ?? VALUES ${"? ".repeat(len)}`, [
      this._table,
      fields,
      ...values,
    ]);
  }

  private get updateSQL() {
    assert(!!this._updateValue);
    const set = Object.keys(this._updateValue)
      .map((key) => {
        return replaceParams(`?? = ?`, [key, this._updateValue[key]]);
      })
      .join(", ");
    return [
      replaceParams(`UPDATE ?? SET ${set}`, [this._table]),
      this.whereSQL,
    ].join(" ");
  }

  private get deleteSQL() {
    return [replaceParams(`DELETE FROM ??`, [this._table]), this.whereSQL].join(
      " ",
    );
  }

  table(name: string) {
    this._table = name;
    return this;
  }

  order(...orders: Order[]) {
    this._orders = this._orders.concat(orders);
    return this;
  }

  groupBy(...fields: string[]) {
    this._groupBy = fields;
    return this;
  }

  where(where: Where | string) {
    if (typeof where === "string") {
      this._where.push(where);
    } else {
      this._where.push(where.value);
    }
    return this;
  }

  having(where: Where | string) {
    if (typeof where === "string") {
      this._having.push(where);
    } else {
      this._having.push(where.value);
    }
    return this;
  }

  limit(start: number, size: number) {
    this._limit = { start, size };
    return this;
  }

  join(join: Join | string) {
    if (typeof join === "string") {
      this._joins.push(join);
    } else {
      this._joins.push(join.value);
    }
    return this;
  }

  select(...fields: string[]) {
    this._type = "select";
    assert(fields.length > 0);
    this._fields = this._fields.concat(
      fields.map((field) => {
        if (field.toLocaleLowerCase().indexOf(" as ") > -1) {
          return field;
        } else if (field.split(".").length > 1) {
          return replaceParams("??.??", field.split("."));
        } else {
          return replaceParams("??", [field]);
        }
      }),
    );
    return this;
  }

  insert(data: Object[] | Object) {
    this._type = "insert";
    if (!(data instanceof Array)) {
      data = [data];
    }
    this._insertValues = data as [];
    return this;
  }

  update(data: Object) {
    this._type = "update";
    this._updateValue = data;
    return this;
  }

  delete(table?: string) {
    if (table) this._table = table;
    this._type = "delete";
    return this;
  }

  clone() {
    const newQuery = new Query();
    newQuery._type = this._type;
    newQuery._table = this._table;
    newQuery._where = this._where;
    newQuery._joins = this._joins;
    newQuery._orders = this._orders;
    newQuery._fields = this._fields;
    newQuery._groupBy = this._groupBy;
    newQuery._having = this._having;
    newQuery._insertValues = this._insertValues;
    newQuery._updateValue = this._updateValue;
    newQuery._limit = this._limit;
    return newQuery;
  }

  build(): string {
    assert(!!this._table);
    switch (this._type) {
      case "select":
        return this.selectSQL;
      case "insert":
        return this.insertSQL;
      case "update":
        return this.updateSQL;
      case "delete":
        return this.deleteSQL;
      default:
        return "";
    }
  }
}
