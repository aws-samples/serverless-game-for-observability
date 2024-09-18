import { Construct } from "constructs";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

export class DynamoDB {
    //attributes for storing DynamoDB table names
    playerTableName: string;
    sessionTableName: string;
    constructor ( scope : Construct,  id: string){
        this.sessionTableName = id + '-GameSessionTable'
        this.playerTableName = id + '-PlayerTable'
        // create a new DynamoDB Table
        const playerTable = new dynamodb.Table(scope, id + "-PlayerTable", {
            tableName: this.playerTableName,
            partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const sessionTable = new dynamodb.Table(scope, id + "-GameSessionTable", {
            tableName: this.sessionTableName,
            partitionKey: { name: 'roomId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
    }
}