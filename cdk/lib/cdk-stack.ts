import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaAPIs } from './apis';
import { Queues } from './sqs';

// get environment value
const enableXray  = Boolean(process.env.ENABLE_XRAY || "false");
const targetsFrequency = Number(process.env.TARGETS_FREQUENCY || "10");
const targetsPerBatch = Number(process.env.TARGETS_PER_BATCH || "10");
const tempName = "aws-serverless-game-demo01"

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    

    const queues = new Queues(this, tempName, {
      enableXray: enableXray
    })

    new LambdaAPIs(this, tempName, {
      enableXray: enableXray,
      targetsFrequency: targetsFrequency,
      targetsPerBatch: targetsPerBatch,
      gameQueue: queues.getQueues().get('game_queue'),
      targetQueue: queues.getQueues().get('target_queue')
    })

  }
}
