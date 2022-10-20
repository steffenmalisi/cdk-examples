import { MySqlContainer, StartedMySqlContainer } from "testcontainers";
import * as mysql from "mysql2/promise";

import { handler } from "./index";
import { SecretsManagerDbSecret } from "./db-secret";

jest.setTimeout(120_000);

describe("When trying to run database migrations, it", () => {
  it("should run all the migrations in the mysql container", async () => {
    let container: StartedMySqlContainer | undefined;
    let connection: mysql.Connection | undefined;
    try {
      container = await new MySqlContainer().start();
      console.log(
        `Container started.
      host:     ${container.getHost()},
      port:     ${container.getPort()},
      database: ${container.getDatabase()},
      username: ${container.getUsername()},
      password: ${container.getUserPassword()}`
      );

      const dbConnectionOptions: mysql.ConnectionOptions = {
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getUserPassword(),
      };

      const secretsManagerDbSecret: SecretsManagerDbSecret = {
        host: container.getHost(),
        port: container.getPort(),
        dbname: container.getDatabase(),
        username: container.getUsername(),
        password: container.getUserPassword(),
      };

      connection = await mysql.createConnection(dbConnectionOptions);
      await connection.connect();
      let rows: any = await connection.query("show tables;");
      console.log("Database tables before", rows[0]);

      expect(rows[0].length).toBe(0);

      process.env = Object.assign(process.env, {
        DB_SECRET_ARN: JSON.stringify(secretsManagerDbSecret),
      });

      await handler({ RequestType: "Create" }, {});

      rows = await connection.query("show tables;");
      console.log("Database tables after", rows[0]);

      expect(rows[0].length).toBe(3);
    } finally {
      if (connection) {
        await connection.end();
      }
      if (container) {
        await container.stop();
      }
    }
  });
});
