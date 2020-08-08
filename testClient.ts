import { Client } from './mod.ts';

console.log('----------first ----------');
const client = await new Client().connect({
  hostname: "127.0.0.1",
  // debug: true,
  port: 3307,
  username: "root",
  db: "mytest",
  password: "123",
});
console.log('----------first ----------');
const result = await client.execute('show databases;')
setInterval(() => {}, 20000)
  // const result = await client.execute('use mytest;')
  // const result1 = await client.query('select * from mtest;')
  // console.log('----------result----------', result);
  // console.log('----------result1----------', result1);
  // console.log('----------second ----------');
  // const result2 = await client.query('select * from mtest;')
  // console.log('----------second result----------', result2);
