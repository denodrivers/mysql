import { assertEquals, assertInstanceOf } from "@std/assert";
import { emptyDir } from "@std/fs";
import { join } from "@std/path";
import { MysqlConnection } from "./connection.ts";
import { DIR_TMP_TEST } from "./utils/testing.ts";
import { buildQuery } from "./packets/builders/query.ts";
import { URL_TEST_CONNECTION } from "./utils/testing.ts";
import { connectionConstructorTest } from "@halvardm/sqlx/testing";

Deno.test("Connection", async (t) => {
  await emptyDir(DIR_TMP_TEST);

  const PATH_PEM_CA = join(DIR_TMP_TEST, "ca.pem");
  const PATH_PEM_CA2 = join(DIR_TMP_TEST, "ca2.pem");
  const PATH_PEM_CERT = join(DIR_TMP_TEST, "cert.pem");
  const PATH_PEM_KEY = join(DIR_TMP_TEST, "key.pem");

  await Deno.writeTextFile(PATH_PEM_CA, "ca");
  await Deno.writeTextFile(PATH_PEM_CA2, "ca2");
  await Deno.writeTextFile(PATH_PEM_CERT, "cert");
  await Deno.writeTextFile(PATH_PEM_KEY, "key");

  await t.step("can construct", async (t) => {
    const connection = new MysqlConnection(URL_TEST_CONNECTION);

    assertInstanceOf(connection, MysqlConnection);
    assertEquals(connection.connectionUrl, URL_TEST_CONNECTION);

    await t.step("can parse connection config simple", () => {
      const url = new URL("mysql://user:pass@127.0.0.1:3306/db");

      const c = new MysqlConnection(url.toString());

      assertEquals(c.config, {
        protocol: "mysql",
        username: "user",
        password: "pass",
        hostname: "127.0.0.1",
        port: 3306,
        schema: "db",
        socket: undefined,
        tls: undefined,
        parameters: {},
      });
    });
    await t.step("can parse connection config full", () => {
      const url = new URL("mysql://user:pass@127.0.0.1:3306/db");
      url.searchParams.set("socket", "/tmp/mysql.sock");
      url.searchParams.set("ssl-mode", "VERIFY_IDENTITY");
      url.searchParams.set("ssl-ca", PATH_PEM_CA);
      url.searchParams.set("ssl-capath", DIR_TMP_TEST);
      url.searchParams.set("ssl-cert", PATH_PEM_CERT);
      url.searchParams.set("ssl-cipher", "cipher");
      url.searchParams.set("ssl-crl", "crl.pem");
      url.searchParams.set("ssl-crlpath", "crlpath.pem");
      url.searchParams.set("ssl-key", PATH_PEM_KEY);
      url.searchParams.set("tls-version", "TLSv1.2,TLSv1.3");
      url.searchParams.set("tls-versions", "[TLSv1.2,TLSv1.3]");
      url.searchParams.set("tls-ciphersuites", "ciphersuites");
      url.searchParams.set("auth-method", "AUTO");
      url.searchParams.set("get-server-public-key", "true");
      url.searchParams.set("server-public-key-path", "key.pem");
      url.searchParams.set("ssh", "usr@host:port");
      url.searchParams.set("uri", "mysql://user@127.0.0.1:3306");
      url.searchParams.set("ssh-password", "pass");
      url.searchParams.set("ssh-config-file", "config");
      url.searchParams.set("ssh-config-file", "config");
      url.searchParams.set("ssh-identity-file", "identity");
      url.searchParams.set("ssh-identity-pass", "identitypass");
      url.searchParams.set("connect-timeout", "10");
      url.searchParams.set("compression", "preferred");
      url.searchParams.set("compression-algorithms", "algo");
      url.searchParams.set("compression-level", "level");
      url.searchParams.set("connection-attributes", "true");

      const c = new MysqlConnection(url.toString());

      assertEquals(c.config, {
        protocol: "mysql",
        username: "user",
        password: "pass",
        hostname: "127.0.0.1",
        port: 3306,
        socket: "/tmp/mysql.sock",
        schema: "db",
        tls: {
          mode: "VERIFY_IDENTITY",
          caCerts: [
            "ca",
            "ca2",
            "cert",
            "key",
          ],
          cert: "cert",
          hostname: "127.0.0.1",
          key: "key",
          port: 3306,
        },
        parameters: {
          socket: "/tmp/mysql.sock",
          sslMode: "VERIFY_IDENTITY",
          sslCa: [PATH_PEM_CA],
          sslCapath: [DIR_TMP_TEST],
          sslCert: PATH_PEM_CERT,
          sslCipher: "cipher",
          sslCrl: "crl.pem",
          sslCrlpath: "crlpath.pem",
          sslKey: PATH_PEM_KEY,
          tlsVersion: "TLSv1.2,TLSv1.3",
          tlsVersions: "[TLSv1.2,TLSv1.3]",
          tlsCiphersuites: "ciphersuites",
          authMethod: "AUTO",
          getServerPublicKey: true,
          serverPublicKeyPath: "key.pem",
          ssh: "usr@host:port",
          uri: "mysql://user@127.0.0.1:3306",
          sshPassword: "pass",
          sshConfigFile: "config",
          sshIdentityFile: "identity",
          sshIdentityPass: "identitypass",
          connectTimeout: 10,
          compression: "preferred",
          compressionAlgorithms: "algo",
          compressionLevel: "level",
          connectionAttributes: "true",
        },
      });
    });

    await connection.close();
  });

  await connectionConstructorTest({
    t,
    Connection: MysqlConnection,
    connectionUrl: URL_TEST_CONNECTION,
    connectionOptions: {},
  });

  await t.step("can query database", async (t) => {
    await using connection = new MysqlConnection(URL_TEST_CONNECTION);
    await connection.connect();
    await t.step("can sendData", async () => {
      const data = buildQuery("SELECT 1+1 AS result;");
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: [2],
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 129,
              fieldLen: 3,
              fieldType: 8,
              name: "result",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can parse time", async () => {
      const data = buildQuery(`SELECT CAST("09:04:10" AS time) as time`);
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: ["09:04:10"],
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 128,
              fieldLen: 10,
              fieldType: 11,
              name: "time",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can parse date", async () => {
      const data = buildQuery(
        `SELECT CAST("2024-04-15 09:04:10" AS date) as date`,
      );
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: [new Date("2024-04-15T00:00:00.000Z")],
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 128,
              fieldLen: 10,
              fieldType: 10,
              name: "date",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can parse bigint", async () => {
      const data = buildQuery(`SELECT 9223372036854775807 as result`);
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: [9223372036854775807n],
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 129,
              fieldLen: 20,
              fieldType: 8,
              name: "result",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can parse decimal", async () => {
      const data = buildQuery(
        `SELECT 0.012345678901234567890123456789 as result`,
      );
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: ["0.012345678901234567890123456789"],
          fields: [
            {
              catalog: "def",
              decimals: 30,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 129,
              fieldLen: 33,
              fieldType: 246,
              name: "result",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can parse empty string", async () => {
      const data = buildQuery(`SELECT '' as result`);
      for await (const result1 of connection.sendData(data)) {
        assertEquals(result1, {
          row: [""],
          fields: [
            {
              catalog: "def",
              decimals: 31,
              defaultVal: "",
              encoding: 33,
              fieldFlag: 1,
              fieldLen: 0,
              fieldType: 253,
              name: "result",
              originName: "",
              originTable: "",
              schema: "",
              table: "",
            },
          ],
        });
      }
    });

    await t.step("can drop and create table", async () => {
      const dropTableSql = buildQuery("DROP TABLE IF EXISTS test;");
      const dropTableReturned = connection.sendData(dropTableSql);
      assertEquals(await dropTableReturned.next(), {
        done: true,
        value: { affectedRows: 0, lastInsertId: 0 },
      });
      const createTableSql = buildQuery(
        "CREATE TABLE IF NOT EXISTS test (id INT);",
      );
      const createTableReturned = connection.sendData(createTableSql);
      assertEquals(await createTableReturned.next(), {
        done: true,
        value: { affectedRows: 0, lastInsertId: 0 },
      });
      const result = await Array.fromAsync(createTableReturned);
      assertEquals(result, []);
    });

    await t.step("can insert to table", async () => {
      const data = buildQuery("INSERT INTO test (id) VALUES (1),(2),(3);");
      const returned = connection.sendData(data);
      assertEquals(await returned.next(), {
        done: true,
        value: { affectedRows: 3, lastInsertId: 0 },
      });
      const result = await Array.fromAsync(returned);
      assertEquals(result, []);
    });

    await t.step("can select from table using sendData", async () => {
      const data = buildQuery("SELECT * FROM test;");
      const returned = connection.sendData(data);
      const result = await Array.fromAsync(returned);
      assertEquals(result, [
        {
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 0,
              fieldLen: 11,
              fieldType: 3,
              name: "id",
              originName: "id",
              originTable: "test",
              schema: "testdb",
              table: "test",
            },
          ],
          row: [
            1,
          ],
        },
        {
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 0,
              fieldLen: 11,
              fieldType: 3,
              name: "id",
              originName: "id",
              originTable: "test",
              schema: "testdb",
              table: "test",
            },
          ],
          row: [
            2,
          ],
        },
        {
          fields: [
            {
              catalog: "def",
              decimals: 0,
              defaultVal: "",
              encoding: 63,
              fieldFlag: 0,
              fieldLen: 11,
              fieldType: 3,
              name: "id",
              originName: "id",
              originTable: "test",
              schema: "testdb",
              table: "test",
            },
          ],
          row: [
            3,
          ],
        },
      ]);
    });

    await t.step("can insert to table using executeRaw", async () => {
      const data = buildQuery("INSERT INTO test (id) VALUES (4);");
      const result = await connection.executeRaw(data);
      assertEquals(result, 1);
    });

    await t.step("can select from table using executeRaw", async () => {
      const data = buildQuery("SELECT * FROM test;");
      const result = await connection.executeRaw(data);
      assertEquals(result, undefined);
    });

    await t.step("can insert to table using queryManyObjectRaw", async () => {
      const data = buildQuery("INSERT INTO test (id) VALUES (5);");
      const result = await Array.fromAsync(connection.queryManyObjectRaw(data));
      assertEquals(result, []);
    });

    await t.step("can select from table using queryManyObjectRaw", async () => {
      const data = buildQuery("SELECT * FROM test;");
      const result = await Array.fromAsync(connection.queryManyObjectRaw(data));
      assertEquals(result, [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
      ]);
    });

    await t.step("can insert to table using queryManyArrayRaw", async () => {
      const data = buildQuery("INSERT INTO test (id) VALUES (6);");
      const result = await Array.fromAsync(connection.queryManyArrayRaw(data));
      assertEquals(result, []);
    });

    await t.step("can select from table using queryManyArrayRaw", async () => {
      const data = buildQuery("SELECT * FROM test;");
      const result = await Array.fromAsync(connection.queryManyArrayRaw(data));
      assertEquals(result, [
        [1],
        [2],
        [3],
        [4],
        [5],
        [6],
      ]);
    });

    await t.step("can drop table", async () => {
      const data = buildQuery("DROP TABLE IF EXISTS test;");
      const returned = connection.sendData(data);
      assertEquals(await returned.next(), {
        done: true,
        value: { affectedRows: 0, lastInsertId: 0 },
      });
      const result = await Array.fromAsync(returned);
      assertEquals(result, []);
    });
  });

  await emptyDir(DIR_TMP_TEST);
});
