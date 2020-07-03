import { BufferReader } from './src/buffer.ts'
import { parseHandshake } from './src/packets/parsers/handshake.ts';
import { Client } from './mod.ts';
import { debug, log } from "./src/logger.ts";

async function myProbe() {
  const connection = await Deno.connect({ hostname: '127.0.0.1', port: 3307 })
  // let result: number | null = 0;
  // const uint = new Uint8Array(4);
  // console.log('uint: ', uint);
  // while (result !== null) {
  //   result = await connection.read(uint);
  //   console.log('result', result);
  //   console.log('uint2: ', uint);
  // }

  const header = new BufferReader(new Uint8Array(4));
  let readCount = 0;
  let nread = await connection.read(header.buffer);
  let myheader = {
    size: header.readUints(3),
    no: header.readUint8(),
  };
  const body = new BufferReader(new Uint8Array(myheader.size))
  await connection.read(body.buffer);
  const result = parseHandshake(body);
  console.log('result', result);

  const packet = new Uint8Array(32)
  packet[0] = 0x00;
  packet[1] = 0x00;
  packet[2] = 0x02;
  packet[3] = 0x00;
  packet[4] = 0x00;
  packet[5] = 0x00;
  packet[6] = 0x00;
  packet[7] = 0x10;
  packet[8] = 0x21;
  for (let n = 0; n < 23; n++) {
    packet[n + 9] = 0;
  }
  connection.write(packet);

  setInterval(() => { }, 60 * 1000)
}

async function useLib() {
  const client = await new Client().connect({
    hostname: "127.0.0.1",
    debug: true,
    port: 3307,
    username: "root",
    db: "mytest",
    password: "123",
  });
  console.log('----------first ----------');
  // const result = await client.execute('show databases;')
  // const result = await client.execute('use mytest;')
  // const result1 = await client.query('select * from mtest;')
  // console.log('----------result----------', result);
  // console.log('----------result1----------', result1);
  // console.log('----------second ----------');
  // const result2 = await client.query('select * from mtest;')
  // console.log('----------second result----------', result2);

}

async function testCase() {
  const config = {
    timeout: 10000,
    pool: 3,
    debug: true,
    hostname: "127.0.0.1",
    port: 3307,
    username: "root",
    db: "mytest",
    password: "123",
  };

  let client = await new Client().connect(config);
  await client.execute(`CREATE DATABASE mydemo;`);
  await client.execute(`USE mydemo;`);
  await client.execute(`
    CREATE TABLE user_info (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        is_top tinyint(1) default 0,
        created_at timestamp not null default current_timestamp,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
  await client.close();
  console.log('success!')
}

function testLog() {

  // Simple default logger out of the box. You can customize it
  // by overriding logger and handler named "default", or providing
  // additional logger configurations. You can log any data type.
  log.info("Hello world");
  log.debug("Hello world");
  // log.info(123456);
  // log.warning(true);
  // log.error({ foo: "bar", fizz: "bazz" });
  // log.critical("500 Internal server error");
}


// testLog();
// await testCase();
await useLib();

