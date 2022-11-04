import * as mysql from "mysql2";
import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import { SecretsManagerDbSecret, injectDbSecret } from "../../src/middleware/db-secret";

const marv = require("marv/api/promise");
const marvDriver = require("marv-mysql-driver");

const logger = new Logger();

const onCreate = async (dbSecret: SecretsManagerDbSecret) => {
  logger.info("Start to run database migrations");
  const migrations = await marv.scan(`${__dirname}/migrations`);

  const opts: mysql.ConnectionOptions = {
    host: dbSecret.host,
    port: dbSecret.port,
    database: dbSecret.dbname,
    user: dbSecret.username,
    password: dbSecret.password,
    multipleStatements: true,
  };
  await marv.migrate(migrations, marvDriver({ mysql, connection: opts }));
  logger.info("Database migrations successfully run");
};

const lambdaHandler = async (event: any, context: any) => {
  try {
    logger.info("Start to modify database schema");
    switch (event.RequestType) {
      case "Create":
        return onCreate(context.dbSecret);
      case "Update":
        return onCreate(context.dbSecret);
      case "Delete":
        return {};
      default:
        return {};
    }
  } catch (error) {
    logger.error(
      "An error ocurred while trying to modify the database schema",
      error as Error
    );
    throw error;
  }
};

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger))
  .use(injectDbSecret());
