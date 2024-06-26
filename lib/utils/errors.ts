import { isSqlError, SqlError } from "@stdext/sql";

export class MysqlError extends SqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlConnectionError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlWriteError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlReadError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlResponseTimeoutError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlProtocolError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

export class MysqlTransactionError extends MysqlError {
  constructor(msg: string) {
    super(msg);
  }
}

/**
 * Check if an error is a MysqlError
 */
export function isMysqlError(err: unknown): err is MysqlError {
  return isSqlError(err) && err instanceof MysqlError;
}
