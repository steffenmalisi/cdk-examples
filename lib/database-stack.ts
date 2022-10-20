import { aws_rds as rds, aws_ec2 as ec2, RemovalPolicy } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { IVpc } from "aws-cdk-lib/aws-ec2";

export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpc: IVpc;
}

export class DatabaseStack extends cdk.Stack {
  db: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.db = new rds.DatabaseInstance(this, "QuizMasterData", {
      databaseName: "quizMasterData",
      storageEncrypted: true,
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_30,
      }),
      vpcSubnets: {
        subnetGroupName: "database",
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      removalPolicy: RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.db.secret!.secretArn,
    });
  }
}
