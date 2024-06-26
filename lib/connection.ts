import {
  MysqlConnectionError,
  MysqlProtocolError,
  MysqlReadError,
  MysqlResponseTimeoutError,
} from "./utils/errors.ts";
import { buildAuth } from "./packets/builders/auth.ts";
import { PacketReader, PacketWriter } from "./packets/packet.ts";
import { parseError } from "./packets/parsers/err.ts";
import {
  AuthResult,
  parseAuth,
  parseHandshake,
} from "./packets/parsers/handshake.ts";
import {
  type FieldInfo,
  getRowObject,
  type MysqlParameterType,
  parseField,
  parseRowArray,
} from "./packets/parsers/result.ts";
import { ComQueryResponsePacket } from "./constant/packet.ts";
import { AuthPlugins } from "./auth_plugins/mod.ts";
import { parseAuthSwitch } from "./packets/parsers/authswitch.ts";
import auth from "./utils/hash.ts";
import { ServerCapabilities } from "./constant/capabilities.ts";
import { buildSSLRequest } from "./packets/builders/tls.ts";
import { logger } from "./utils/logger.ts";
import type {
  ArrayRow,
  Row,
  SqlConnectable,
  SqlConnection,
  SqlConnectionOptions,
  SqlQueryOptions,
} from "@stdext/sql";
import { resolve } from "@std/path";
import { toCamelCase } from "@std/text";
import { AuthPluginName } from "./auth_plugins/mod.ts";
import { buildQuery } from "./packets/builders/query.ts";
import type { MysqlQueryOptions } from "./core.ts";

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING,
  CONNECTED,
  CLOSING,
  CLOSED,
}

export type ConnectionSendDataNext = {
  row: ArrayRow<unknown>;
  fields: FieldInfo[];
};
export type ConnectionSendDataResult = {
  affectedRows: number | undefined;
  lastInsertId: number | undefined;
};

/**
 * Tls mode for mysql connection
 *
 * @see {@link https://dev.mysql.com/doc/refman/8.0/en/connection-options.html#option_general_ssl-mode}
 */
export const TlsMode = {
  Preferred: "PREFERRED",
  Disabled: "DISABLED",
  Required: "REQUIRED",
  VerifyCa: "VERIFY_CA",
  VerifyIdentity: "VERIFY_IDENTITY",
} as const;
export type TlsMode = typeof TlsMode[keyof typeof TlsMode];

export type TlsOptions =
  & Deno.ConnectTlsOptions
  & Partial<Deno.TlsCertifiedKeyPem>
  & {
    mode: TlsMode;
  };

/**
 * Aditional connection parameters
 *
 * @see {@link https://dev.mysql.com/doc/refman/8.0/en/connecting-using-uri-or-key-value-pairs.html#connecting-using-uri}
 */
export interface ConnectionParameters {
  socket?: string;
  sslMode?: TlsMode;
  sslCa?: string[];
  sslCapath?: string[];
  sslCert?: string;
  sslCipher?: string;
  sslCrl?: string;
  sslCrlpath?: string;
  sslKey?: string;
  tlsVersion?: string;
  tlsVersions?: string;
  tlsCiphersuites?: string;
  authMethod?: string;
  getServerPublicKey?: boolean;
  serverPublicKeyPath?: string;
  ssh?: string;
  uri?: string;
  sshPassword?: string;
  sshConfigFile?: string;
  sshIdentityFile?: string;
  sshIdentityPass?: string;
  connectTimeout?: number;
  compression?: string;
  compressionAlgorithms?: string;
  compressionLevel?: string;
  connectionAttributes?: string;
}

export interface ConnectionConfig {
  protocol: string;
  username: string;
  password?: string;
  hostname: string;
  port: number;
  socket?: string;
  schema?: string;
  /**
   * Tls options
   */
  tls?: Partial<TlsOptions>;
  /**
   * Aditional connection parameters
   */
  parameters: ConnectionParameters;
}

export interface MysqlConnectionOptions extends SqlConnectionOptions {
  tls?: Partial<TlsOptions>;
}

/** Connection for mysql */
export class MysqlConnection implements
  SqlConnection<
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions
  > {
  state: ConnectionState = ConnectionState.CONNECTING;
  capabilities: number = 0;
  serverVersion: string = "";

  protected _conn: Deno.Conn | null = null;
  private _timedOut = false;

  readonly connectionUrl: string;
  readonly options: MysqlConnectionOptions;
  readonly config: ConnectionConfig;

  get conn(): Deno.Conn {
    if (!this._conn) {
      throw new MysqlConnectionError("Not connected");
    }
    if (this.state != ConnectionState.CONNECTED) {
      if (this.state == ConnectionState.CLOSED) {
        throw new MysqlConnectionError("Connection is closed");
      } else {
        throw new MysqlConnectionError("Must be connected first");
      }
    }
    return this._conn;
  }

  set conn(conn: Deno.Conn | null) {
    this._conn = conn;
  }
  get connected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }
  constructor(
    connectionUrl: string | URL,
    connectionOptions: MysqlConnectionOptions = {},
  ) {
    this.connectionUrl = connectionUrl.toString().split("?")[0];
    this.options = connectionOptions;
    this.config = this.#parseConnectionConfig(
      connectionUrl,
      connectionOptions,
    );
  }

  async connect(): Promise<void> {
    // TODO: implement connect timeout
    if (
      this.config.tls?.mode &&
      this.config.tls?.mode !== TlsMode.Disabled &&
      this.config.tls?.mode !== TlsMode.VerifyIdentity
    ) {
      throw new Error("unsupported tls mode");
    }

    logger().info(
      `connecting ${this.connectionUrl},${JSON.stringify(this.config)}`,
    );

    if (this.config.socket) {
      this.conn = await Deno.connect({
        transport: "unix",
        path: this.config.socket,
      });
    } else {
      this.conn = await Deno.connect({
        transport: "tcp",
        hostname: this.config.hostname,
        port: this.config.port,
      });
    }

    try {
      let receive = await this.#nextPacket();
      const handshakePacket = parseHandshake(receive.body);

      let handshakeSequenceNumber = receive.header.no;

      // Deno.startTls() only supports VERIFY_IDENTITY now.
      let isSSL = false;
      if (
        this.config.tls?.mode === TlsMode.VerifyIdentity
      ) {
        if (
          (handshakePacket.serverCapabilities &
            ServerCapabilities.CLIENT_SSL) === 0
        ) {
          throw new Error("Server does not support TLS");
        }
        if (
          (handshakePacket.serverCapabilities &
            ServerCapabilities.CLIENT_SSL) !== 0
        ) {
          const tlsData = buildSSLRequest(handshakePacket, {
            db: this.config.schema,
          });
          await PacketWriter.write(
            this.conn,
            tlsData,
            ++handshakeSequenceNumber,
          );
          this.conn = await Deno.startTls(this.conn as Deno.TcpConn, {
            hostname: this.config.hostname,
            caCerts: this.config.tls?.caCerts,
          });
        }
        isSSL = true;
      }

      const data = await buildAuth(handshakePacket, {
        username: this.config.username,
        password: this.config.password,
        db: this.config.schema,
        ssl: isSSL,
      });

      await PacketWriter.write(this._conn!, data, ++handshakeSequenceNumber);

      this.state = ConnectionState.CONNECTING;
      this.serverVersion = handshakePacket.serverVersion;
      this.capabilities = handshakePacket.serverCapabilities;

      receive = await this.#nextPacket();

      const authResult = parseAuth(receive);
      let authPlugin: AuthPluginName | undefined = undefined;

      switch (authResult) {
        case AuthResult.AuthMoreRequired: {
          authPlugin = handshakePacket.authPluginName as AuthPluginName;
          break;
        }
        case AuthResult.MethodMismatch: {
          const authSwitch = parseAuthSwitch(receive.body);
          // If CLIENT_PLUGIN_AUTH capability is not supported, no new cipher is
          // sent and we have to keep using the cipher sent in the init packet.
          if (
            authSwitch.authPluginData === undefined ||
            authSwitch.authPluginData.length === 0
          ) {
            authSwitch.authPluginData = handshakePacket.seed;
          }

          let authData;
          if (this.config.password) {
            authData = await auth(
              authSwitch.authPluginName,
              this.config.password,
              authSwitch.authPluginData,
            );
          } else {
            authData = Uint8Array.from([]);
          }

          await PacketWriter.write(
            this.conn,
            authData,
            receive.header.no + 1,
          );

          receive = await this.#nextPacket();
          const authSwitch2 = parseAuthSwitch(receive.body);
          if (authSwitch2.authPluginName !== "") {
            throw new Error(
              "Do not allow to change the auth plugin more than once!",
            );
          }
        }
      }

      if (authPlugin) {
        switch (authPlugin) {
          case AuthPluginName.CachingSha2Password: {
            const plugin = new AuthPlugins[authPlugin](
              handshakePacket.seed,
              this.config.password!,
            );

            while (!plugin.done) {
              if (plugin.data) {
                const sequenceNumber = receive.header.no + 1;
                await PacketWriter.write(
                  this.conn,
                  plugin.data,
                  sequenceNumber,
                );
                receive = await this.#nextPacket();
              }
              if (plugin.quickRead) {
                await this.#nextPacket();
              }

              await plugin.next(receive);
            }
            break;
          }
          default:
            throw new Error("Unsupported auth plugin");
        }
      }

      const header = receive.body.readUint8();
      if (header === 0xff) {
        const error = parseError(receive.body, this);
        logger().error(`connect error(${error.code}): ${error.message}`);
        this.close();
        throw new Error(error.message);
      } else {
        logger().info(`connected to ${this.connectionUrl}`);
        this.state = ConnectionState.CONNECTED;
      }
    } catch (error) {
      // Call close() to avoid leaking socket.
      this.close();
      throw error;
    }
  }

  close(): Promise<void> {
    if (this.state != ConnectionState.CLOSED) {
      logger().info("close connection");
      this._conn?.close();
      this.state = ConnectionState.CLOSED;
    }
    return Promise.resolve();
  }

  /**
   * Parses the connection url and options into a connection config
   */
  #parseConnectionConfig(
    connectionUrl: string | URL,
    connectionOptions: MysqlConnectionOptions,
  ): ConnectionConfig {
    function parseParameters(url: URL): ConnectionParameters {
      const parameters: ConnectionParameters = {};
      for (const [key, value] of url.searchParams) {
        const pKey = toCamelCase(key);
        if (pKey === "sslCa") {
          if (!parameters.sslCa) {
            parameters.sslCa = [];
          }
          parameters.sslCa.push(value);
        } else if (pKey === "sslCapath") {
          if (!parameters.sslCapath) {
            parameters.sslCapath = [];
          }
          parameters.sslCapath.push(value);
        } else if (pKey === "getServerPublicKey") {
          parameters.getServerPublicKey = value === "true";
        } else if (pKey === "connectTimeout") {
          parameters.connectTimeout = parseInt(value);
        } else {
          // deno-lint-ignore no-explicit-any
          parameters[pKey as keyof ConnectionParameters] = value as any;
        }
      }
      return parameters;
    }

    function parseTlsOptions(config: ConnectionConfig): TlsOptions | undefined {
      const baseTlsOptions: TlsOptions = {
        port: config.port,
        hostname: config.hostname,
        mode: TlsMode.Preferred,
      };

      if (connectionOptions.tls) {
        return {
          ...baseTlsOptions,
          ...connectionOptions.tls,
        };
      }

      if (config.parameters.sslMode) {
        const tlsOptions: TlsOptions = {
          ...baseTlsOptions,
          mode: config.parameters.sslMode,
        };

        const caCertPaths = new Set<string>();

        if (config.parameters.sslCa?.length) {
          for (const caCert of config.parameters.sslCa) {
            caCertPaths.add(resolve(caCert));
          }
        }

        if (config.parameters.sslCapath?.length) {
          for (const caPath of config.parameters.sslCapath) {
            for (const f of Deno.readDirSync(caPath)) {
              if (f.isFile && f.name.endsWith(".pem")) {
                caCertPaths.add(resolve(caPath, f.name));
              }
            }
          }
        }

        if (caCertPaths.size) {
          tlsOptions.caCerts = [];
          for (const caCert of caCertPaths) {
            const content = Deno.readTextFileSync(caCert);
            tlsOptions.caCerts.push(content);
          }
          // Due to some random bug in CI, we need to sort this for the test to pass consistently.
          tlsOptions.caCerts.sort();
        }

        if (config.parameters.sslKey) {
          tlsOptions.key = Deno.readTextFileSync(
            resolve(config.parameters.sslKey),
          );
        }

        if (config.parameters.sslCert) {
          tlsOptions.cert = Deno.readTextFileSync(
            resolve(config.parameters.sslCert),
          );
        }

        return tlsOptions;
      }
      return undefined;
    }

    const url = new URL(connectionUrl);
    const parameters = parseParameters(url);
    const config: ConnectionConfig = {
      protocol: url.protocol.slice(0, -1),
      username: url.username,
      password: url.password || undefined,
      hostname: url.hostname,
      port: parseInt(url.port || "3306"),
      schema: url.pathname.slice(1),
      parameters: parameters,
      socket: parameters.socket,
    };

    config.tls = parseTlsOptions(config);

    return config;
  }

  async #nextPacket(): Promise<PacketReader> {
    if (!this._conn) {
      throw new MysqlConnectionError("Not connected");
    }

    const timeoutTimer = this.config.parameters.connectTimeout
      ? setTimeout(
        this.#timeoutCallback,
        this.config.parameters.connectTimeout,
      )
      : null;
    let packet: PacketReader | null;
    try {
      packet = await PacketReader.read(this._conn);
    } catch (error) {
      if (this._timedOut) {
        // Connection has been closed by timeoutCallback.
        throw new MysqlResponseTimeoutError("Connection read timed out");
      }
      timeoutTimer && clearTimeout(timeoutTimer);
      this.close();
      throw error;
    }
    timeoutTimer && clearTimeout(timeoutTimer);

    if (!packet) {
      // Connection is half-closed by the remote host.
      // Call close() to avoid leaking socket.
      this.close();
      throw new MysqlReadError("Connection closed unexpectedly");
    }
    if (packet.type === ComQueryResponsePacket.ERR_Packet) {
      packet.body.skip(1);
      const error = parseError(packet.body, this);
      throw new Error(error.message);
    }
    return packet;
  }

  #timeoutCallback = () => {
    logger().info("connection read timed out");
    this._timedOut = true;
    this.close();
  };

  async *sendData(
    data: Uint8Array,
    options?: SqlQueryOptions,
  ): AsyncGenerator<
    ConnectionSendDataNext,
    ConnectionSendDataResult | undefined
  > {
    try {
      await PacketWriter.write(this.conn, data, 0);
      let receive = await this.#nextPacket();
      logger().debug(`packet type: ${receive.type.toString()}`);
      if (receive.type === ComQueryResponsePacket.OK_Packet) {
        receive.body.skip(1);
        return {
          affectedRows: receive.body.readEncodedLen(),
          lastInsertId: receive.body.readEncodedLen(),
        };
      } else if (receive.type !== ComQueryResponsePacket.Result) {
        throw new MysqlProtocolError(receive.type.toString());
      }
      let fieldCount = receive.body.readEncodedLen();
      const fields: FieldInfo[] = [];
      while (fieldCount--) {
        const packet = await this.#nextPacket();
        if (packet) {
          const field = parseField(packet.body);
          fields.push(field);
        }
      }

      if (!(this.capabilities & ServerCapabilities.CLIENT_DEPRECATE_EOF)) {
        // EOF(mysql < 5.7 or mariadb < 10.2)
        receive = await this.#nextPacket();
        if (receive.type !== ComQueryResponsePacket.EOF_Packet) {
          throw new MysqlProtocolError(receive.type.toString());
        }
      }

      receive = await this.#nextPacket();

      while (receive.type !== ComQueryResponsePacket.EOF_Packet) {
        const row = parseRowArray(receive.body, fields, options);
        yield {
          row,
          fields,
        };
        receive = await this.#nextPacket();
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  async execute(
    sql: string,
    params?: MysqlParameterType[],
    options?: MysqlQueryOptions,
  ): Promise<number | undefined> {
    const data = buildQuery(sql, params);
    const gen = this.sendData(data, options);
    let result = await gen.next();
    if (result.done) {
      return result.value?.affectedRows;
    }

    const debugRest = [];
    debugRest.push(result);
    while (!result.done) {
      result = await gen.next();
      debugRest.push(result);
      logger().debug(`executeRaw overflow: ${JSON.stringify(debugRest)}`);
    }
    logger().debug(`executeRaw overflow: ${JSON.stringify(debugRest)}`);
    return undefined;
  }
  async *queryMany<T extends Row<unknown> = Row<unknown>>(
    sql: string,
    params?: MysqlParameterType[],
    options?: MysqlQueryOptions,
  ): AsyncGenerator<T> {
    const data = buildQuery(sql, params);
    for await (const res of this.sendData(data, options)) {
      yield getRowObject(res.fields, res.row) as T;
    }
  }
  async *queryManyArray<T extends ArrayRow<unknown> = ArrayRow<unknown>>(
    sql: string,
    params?: MysqlParameterType[],
    options?: MysqlQueryOptions,
  ): AsyncGenerator<T> {
    const data = buildQuery(sql, params);
    for await (const res of this.sendData(data, options)) {
      const row = res.row as T;
      yield row as T;
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

export class MysqlConnectable
  implements SqlConnectable<MysqlConnectionOptions, MysqlConnection> {
  readonly connection: MysqlConnection;
  readonly options: MysqlConnectionOptions;

  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: MysqlConnectable["connection"],
    options: MysqlConnectable["options"] = {},
  ) {
    this.connection = connection;
    this.options = options;
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.connection.close();
  }
}