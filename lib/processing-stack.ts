import * as cdk from "aws-cdk-lib";
import {
  aws_lambda_nodejs as lambda_nodejs,
  aws_lambda as lambda,
  aws_rds as rds,
  aws_ec2 as ec2,
  custom_resources,
} from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import * as fs from "fs";
import { MD5 as md5 } from "crypto-js";

export interface ProcessingStackProps extends cdk.StackProps {
  readonly vpc: IVpc;
  readonly db: rds.DatabaseInstance;
}

export class ProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProcessingStackProps) {
    super(scope, id, props);

    const initDbFunction = new lambda_nodejs.NodejsFunction(
      this,
      "InitDbFunction",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/init-db/index.ts`,
        vpc: props.vpc,
        vpcSubnets: {
          subnetGroupName: "processing",
        },
        environment: {
          DB_SECRET_ARN: props.db.secret!.secretArn,
        },
        bundling: {
          commandHooks: {
            beforeInstall(inputDir: string, outputDir: string): string[] {
              return [];
            },
            beforeBundling(inputDir: string, outputDir: string): string[] {
              return [];
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                `cp -r ${inputDir}/lib/init-db/migrations ${outputDir}/migrations`,
                `cp -r ${inputDir}/node_modules/marv-mysql-driver/sql ${outputDir}/sql`,
              ];
            },
          },
        },
        timeout: cdk.Duration.minutes(5),
      }
    );

    initDbFunction.node.addDependency(props.db);
    props.db.secret!.grantRead(initDbFunction);
    initDbFunction.connections.allowTo(props.db, ec2.Port.tcp(3306));

    const dbInitializerProvider = new custom_resources.Provider(
      this,
      "InitDbProvider",
      {
        onEventHandler: initDbFunction,
      }
    );

    const dbInitializerResource = new cdk.CustomResource(
      this,
      "InitDbCustomResource",
      {
        serviceToken: dbInitializerProvider.serviceToken,
        properties: {
          hash: ProcessingStack.hashDbMigrations(),
        },
      }
    );
  }

  static hashDbMigrations(): string {
    const migrationsDir = `${__dirname}/init-db/migrations`;
    const fileHashes: Array<string> = [];
    fs.readdirSync(migrationsDir).forEach((file) => {
      fileHashes.push(
        md5(fs.readFileSync(`${migrationsDir}/${file}`).toString()).toString()
      );
    });
    const sqlHash = md5(fileHashes.join()).toString();
    return sqlHash;
  }
}
