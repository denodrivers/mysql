export class ConnectionError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

export class WriteError extends ConnectionError {
  constructor(msg?: string) {
    super(msg);
  }
}

export class ReadError extends ConnectionError {
  constructor(msg?: string) {
    super(msg);
  }
}

export class ResponseTimeoutError extends ConnectionError {
  constructor(msg?: string) {
    super(msg);
  }
}

export class ProtocolError extends ConnectionError {
  constructor(msg?: string) {
    super(msg);
  }
}
