import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaAPIs } from './apis';
import { Queues } from './sqs';
import { DynamoDB } from './dynamodb';
import { Constants } from './const'; 
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const dynamodb = new DynamoDB(this, Constants.templatePrefixName)

    const queues = new Queues(this, Constants.templatePrefixName, {
      enableXray: Constants.enableXray
    })

    const lambdaApi = new LambdaAPIs(this, Constants.templatePrefixName, {
      enableXray: Constants.enableXray,
      enableXraySdk: Constants.enableXraySdk,
      targetsFrequency: Constants.targetsFrequency,
      targetsPerBatch: Constants.targetsPerBatch,
      gameQueue: queues.getQueueUrls().get('game_queue'),
      gameQueueId: Constants.fifoQueueGroupId,
      targetQueue: queues.getQueueUrls().get('target_queue'),
      gameQueueArn: queues.getQueueArns().get('game_queue'),
      targetQueueArn: queues.getQueueArns().get('target_queue'),
      playerTable: dynamodb.playerTableName,
      sessionTable: dynamodb.sessionTableName,
      logLevel: Constants.logLevel,
      region: this.region
    });
    

  }
}
