import * as mysql from "mysql2/promise";
import { canPrefetch, processCache, clearCache } from "@middy/util";
import { SecretsManagerDbSecret } from "./db-secret";

export type DbConnectionMiddlewareOpts = {
  contextKey?: string;
  disablePrefetch?: boolean;
  cacheKey?: string;
  cacheExpiry?: number;
};

const defaults: DbConnectionMiddlewareOpts = {
  contextKey: "conn",
  disablePrefetch: true,
  cacheKey: "conn",
  cacheExpiry: -1,
};

export const injectDbConnection = (opts: DbConnectionMiddlewareOpts = {}) => {
  const options: DbConnectionMiddlewareOpts = { ...defaults, ...opts };

  const fetch = async (request: any) => {
    const { context } = request;
    if (!context.dbSecret) {
      throw new Error("dbSecret not set in context.");
    }

    // TODO get from internal storage
    const dbSecret = context.dbSecret as SecretsManagerDbSecret;

    const dbConnectionOpts: mysql.ConnectionOptions = {
      host: dbSecret.host,
      port: dbSecret.port,
      database: dbSecret.dbname,
      user: dbSecret.username,
      password: dbSecret.password,
      multipleStatements: true,
    };

    // TODO check if connection can be reused
    let connection: mysql.Connection | undefined;
    try {
      const connection = await mysql.createConnection(dbConnectionOpts);
      await connection.connect();
      return connection;
    } catch (e) {
      clearCache([options.cacheKey!]);
      prefetch = undefined;
      throw new Error((e as Error).message);
    } finally {
      if (connection) {
        connection.end();
      }
    }
  };

  let prefetch: any;
  if (canPrefetch(options)) {
    prefetch = processCache(options, fetch);
  }

  const before = async (request: any) => {
    const { value } = prefetch ?? processCache(options, fetch, request);
    Object.assign(request.context, { [options.contextKey!]: await value });
  };

  const after = async (request: any) => {
    if (options.cacheExpiry === 0) {
      await request.context[options.contextKey!].end();
    }
  }
  const onError = after;

  return {
    before,
    after,
    onError
  };
};
