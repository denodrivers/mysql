import { assertEquals, assertInstanceOf } from "@std/assert";
import { emptyDir } from "@std/fs";
import { join } from "@std/path";
import { MysqlConnection } from "./connection2.ts";
import { DIR_TMP_TEST } from "../test.util.ts";
import { buildQuery } from "./packets/builders/query.ts";

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
    const connection = new MysqlConnection("mysql://127.0.0.1:3306");

    assertInstanceOf(connection, MysqlConnection);
    assertEquals(connection.connectionUrl, "mysql://127.0.0.1:3306");

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
            "key",
            "cert",
            "ca2",
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
  });

  const connection = new MysqlConnection("mysql://root@0.0.0.0:3306");
  assertEquals(connection.connected, false);

  await t.step("can connect and close", async () => {
    await connection.connect();
    assertEquals(connection.connected, true);
    await connection.close();
    assertEquals(connection.connected, false);
  });

  await t.step("can reconnect", async () => {
    await connection.connect();
    assertEquals(connection.connected, true);
    await connection.close();
    assertEquals(connection.connected, false);
  });

  await t.step("can connect with using and dispose", async () => {
    await using connection = new MysqlConnection("mysql://root@0.0.0.0:3306");
    assertEquals(connection.connected, false);
    await connection.connect();
    assertEquals(connection.connected, true);
  });

  await t.step("can execute", async (t) => {
    await using connection = new MysqlConnection("mysql://root@0.0.0.0:3306");
    await connection.connect();
    const data = buildQuery("SELECT 1+1 AS result");
    const result = await connection.execute(data);
    assertEquals(result, { affectedRows: 0, lastInsertId: null });
  });

  await t.step("can execute twice", async (t) => {
    await using connection = new MysqlConnection("mysql://root@0.0.0.0:3306");
    await connection.connect();
    const data = buildQuery("SELECT 1+1 AS result;");
    const result1 = await connection.execute(data);
    assertEquals(result1, { affectedRows: 0, lastInsertId: null });
    const result2 = await connection.execute(data);
    assertEquals(result2, { affectedRows: 0, lastInsertId: null });
  });

  await t.step("can sendData", async (t) => {
    await using connection = new MysqlConnection("mysql://root@0.0.0.0:3306");
    await connection.connect();
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

  await emptyDir(DIR_TMP_TEST);
});
