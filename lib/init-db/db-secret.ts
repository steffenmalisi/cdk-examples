import secretsManager from "@middy/secrets-manager";

export type SecretsManagerDbSecret = {
  host: string;
  port: number;
  username: string;
  password: string;
  dbname: string;
};

export const injectDbSecret = () => {

  return {
    before: async (request: any) => {
      if (!process.env.DB_SECRET_ARN) {
        throw new Error('DB_SECRET_ARN not set in process environment.');
      }

      try {
        const nonSecretsManagerSecret: SecretsManagerDbSecret = JSON.parse(
          process.env.DB_SECRET_ARN
        );
        Object.assign(request.context, { dbSecret: nonSecretsManagerSecret });
      } catch (error) {
        const secretsManagerMiddleware = secretsManager({
          fetchData: {
            dbSecret: process.env.DB_SECRET_ARN,
          },
          awsClientOptions: {
            region: process.env.REGION,
          },
          setToContext: true,
        });
        if (secretsManagerMiddleware.before){
          await secretsManagerMiddleware.before(request);
        }
      }

    },
  };
};
