import { log } from '../deps.ts';
import { ClientConfig } from './client.ts';
import { AuthPacket } from './protocol/packets/auth.ts';
import { HandshakeBody } from './protocol/packets/handshake.ts';
import { Protocol } from './protocol/protocol.ts';

export class Connection {
  #protocol!: Protocol;
  #serverVersion!: string;

  constructor(readonly config: ClientConfig) {}

  get remoteAddr(): string {
    return this.config.socketPath
      ? `unix:${this.config.socketPath}`
      : `${this.config.hostname}:${this.config.port}`;
  }

  async connect(): Promise<void> {
    const {
      hostname,
      port = 3306,
      socketPath,
      username = '',
      password,
    } = this.config;

    log.info(`connecting ${this.remoteAddr}`);

    const socket = !socketPath
      ? await Deno.connect({
          transport: 'tcp',
          hostname,
          port,
        })
      : await Deno.connect({
          transport: 'unix',
          path: socketPath,
        } as any);

    this.#protocol = new Protocol(socket);

    try {
      let receive = await this.#protocol.receive();
      const handshake = new HandshakeBody(receive.body);
      this.#protocol.setCapabilities(handshake.serverCapabilities);
      this.#serverVersion = handshake.serverVersion;

      const { authPluginName } = handshake;

      if (authPluginName === '') {
      }

      const authPacket = new AuthPacket(handshake, {
        username,
        password,
        db: this.config.db,
      });

      await this.#protocol.send(authPacket);

      receive = await this.#protocol.receive();
    } catch (e) {
      throw e;
    }
  }

  async close(): Promise<void> {}
}
