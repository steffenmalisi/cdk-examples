#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { DatabaseStack } from "../lib/database-stack";
import { ProcessingStack } from "../lib/processing-stack";

const app = new cdk.App();
const vpcStack = new VpcStack(app, "VpcStack", {});
const databaseStack = new DatabaseStack(app, "DatabaseStack", {
  vpc: vpcStack.vpc,
});
new ProcessingStack(app, "ProcessingStack", {
  vpc: vpcStack.vpc,
  db: databaseStack.db,
});
