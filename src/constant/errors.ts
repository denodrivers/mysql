export class WriteError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

export class NoResponseError extends Error {}
