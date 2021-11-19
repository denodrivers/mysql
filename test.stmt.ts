import { configLogger } from './mod.ts';
import { Client } from './new/client.ts';
import { ClientConfig } from './new/client.ts';

const config: ClientConfig = {
  timeout: 10000,
  poolSize: 1,
  debug: true,
  hostname: 'localhost',
  username: 'root',
  port: 3306,
  db: 'test',
  charset: 'utf8mb4',
  password: '',
};

configLogger({ enable: true, level: 'DEBUG' });

const client = new Client();
await client.connect(config);

// await client.execute('SELECT id,name from users');

// const result = await client.execute(`INSERT INTO users ?? values ?`, [
//   ['id', 'name'],
//   [2, 'MySQL'],
// ]);

// const result = await client.execute(`SELECT ?`, ['MySQL']);

// console.log(result);
