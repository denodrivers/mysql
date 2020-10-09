export class WriteError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

export class ResponseTimeoutError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}
