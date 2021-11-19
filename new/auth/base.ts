import { ClientConfig } from '../client.ts';
import { HandshakeBody } from '../protocol/packets/handshake.ts';
import { Protocol } from '../protocol/protocol.ts';

export abstract class AuthPlugin {
  abstract name: string;
  constructor(
    readonly config: ClientConfig,
    readonly protocol: Protocol,
    readonly handshake: HandshakeBody
  ) {}

  abstract auth(): Promise<void>;
}
