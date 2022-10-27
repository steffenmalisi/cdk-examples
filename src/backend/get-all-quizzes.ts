import * as mysql from "mysql2/promise";
import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import { injectDbSecret, SecretsManagerDbSecret } from "../middleware/db-secret";
import { injectDbConnection } from "../middleware/db-connection";

const logger = new Logger();

const sqlResponseParser = (quiz: any) => {
  return {
    id: quiz.ID,
    name: quiz.NAME
  }
}

const lambdaHandler = async (event: any, context: any) => {
  try {
    const connection = context.conn as mysql.Connection;
    logger.debug("Get all quizzes from database");
    const rows = await connection.query<mysql.RowDataPacket[][]>("select * from QUIZ;");
    const quizzes = rows[0];
    logger.debug(`Success ${quizzes.length} elements found.`);
    return {
      statusCode: 200,
      body: JSON.stringify(quizzes.map(sqlResponseParser))
    };
  } catch (error) {
    logger.error(
      "An error ocurred while trying to receive all quizzes",
      error as Error
    );
    throw error;
  }
};

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger))
  .use(injectDbSecret())
  .use(injectDbConnection());
