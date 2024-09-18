import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaAPIs } from './apis';
import { Queues } from './sqs';
import { DynamoDB } from './dynamodb';
import { Constants } from './const'; 

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const dynamodb = new DynamoDB(this, Constants.templatePrefixName)

    const queues = new Queues(this, Constants.templatePrefixName, {
      enableXray: Constants.enableXray
    })

    new LambdaAPIs(this, Constants.templatePrefixName, {
      enableXray: Constants.enableXray,
      targetsFrequency: Constants.targetsFrequency,
      targetsPerBatch: Constants.targetsPerBatch,
      gameQueue: queues.getQueues().get('game_queue'),
      gameQueueId: Constants.fifoQueueGroupId,
      targetQueue: queues.getQueues().get('target_queue'),
      playerTable: dynamodb.playerTableName,
      sessionTable: dynamodb.sessionTableName,
      region: this.region
    })

    

  }
}
