import middy from "@middy/core";
import { MySqlContainer, StartedMySqlContainer } from "testcontainers";
import { injectDbConnection } from "./db-connection";
import * as mysql from "mysql2/promise";

jest.setTimeout(120_000);

describe("When trying to inject a database connection, it", () => {
  it("should be available and connected in the handler via the context", async () => {
    let container: StartedMySqlContainer | undefined;
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
      const event = {};
      const context = {
        dbSecret: {
          host: container.getHost(),
          port: container.getPort(),
          dbname: container.getDatabase(),
          username: container.getUsername(),
          password: container.getUserPassword(),
        },
      };

      const handler = middy(async (request, context) => {
        const connection = context.conn as mysql.Connection;
        await connection.execute("create table `quiz` (id int not null);");
        const rows: any = await connection.query("show tables");
        expect(rows[0].length).toBe(1);
      });

      handler.use(injectDbConnection());

      await handler(event, context);
    } catch (e) {
      console.error(e);
    } finally {
      if (container) {
        await container.stop();
      }
    }
  });
});
