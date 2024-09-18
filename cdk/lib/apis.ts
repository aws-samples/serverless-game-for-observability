import * as cdk from 'aws-cdk-lib';
import { IFunction, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { StepFunction } from './step-functions';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaAPIs {

  lambdaFunctions: Map<string, cdk.aws_lambda.Function> = new Map();

  constructor(scope: Construct, id: string, props?: any) {
        
    const lambdaRole = this.createLambdaRoles(scope, id);

    const functions = this.createFunctions(scope, id, lambdaRole, props);
    
    this.createApiGateway(scope, id, functions[0], functions[1], functions[2]);

    const stepFunction = new StepFunction(scope, id, functions[4].functionArn, props);

    props['stateMachineArn'] = stepFunction.stateMachineArn;
    
    functions.push(this.createLogicFunction(scope, id, lambdaRole, props));

  }

  // function to create API Gateway
  createApiGateway(scope: Construct, id: string, defaultFunction: IFunction, connectFunction: IFunction, disconnectFunction: IFunction) {
    const defaultIntegration = new cdk.aws_apigatewayv2_integrations.WebSocketLambdaIntegration(id + '_GameApi_integration_default', defaultFunction)
    const connectIntegration = new cdk.aws_apigatewayv2_integrations.WebSocketLambdaIntegration(id + '_GameApi_integration_connect', connectFunction)
    const disconnectIntegration = new cdk.aws_apigatewayv2_integrations.WebSocketLambdaIntegration(id + '_GameApi_integration_disconnect', disconnectFunction)

    const api = new cdk.aws_apigatewayv2.WebSocketApi(scope, id + '_GameApi', {
      apiName: id + '_GameApi',
      routeSelectionExpression: '$request.body.action',
      defaultRouteOptions: {
          integration: defaultIntegration
      },
      connectRouteOptions: {
        integration: connectIntegration
      },
      disconnectRouteOptions: {
        integration: disconnectIntegration
      },
      
    });

    const webSocketAuthorizer = new cdk.aws_apigatewayv2.WebSocketAuthorizer(scope, id + '_Authorizer', {
      identitySource: ['route.request.querystring.Auth'],
      type: cdk.aws_apigatewayv2.WebSocketAuthorizerType.LAMBDA,
      webSocketApi: api,
      
      // the properties below are optional
      authorizerName: 'authorizerName',
      authorizerUri: 'authorizerUri',
    });
  }

  createLambdaRoles(scope: Construct, id: string){
    // role for lambda functions, it should be able to access CloudWatch, X-Ray, SQS, DynamoDB and SNS
    const lambdaRole = new cdk.aws_iam.Role(scope, 'LambdaRole', {
      roleName: id + '_LambdaRole',
      assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));
    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));
    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'));
    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));
    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSFullAccess'));

    return lambdaRole;
  }

  createFunctions(scope: Construct, id: string, role: cdk.aws_iam.Role, props: any)
  {
    // default lambda function
    const defaultFunction = new cdk.aws_lambda.Function(scope, id + '_default', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/default/code.zip')),
      handler: 'index.handler',
      role: role,
      tracing: props.enableXray,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_default',
      environment: {
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region
      }
    });
    // create alias for the default Function
      // new cdk.aws_lambda.Alias(scope, 'DefaultFunctionAlias', {
      //   aliasName: 'prod',
      //   version: defaultFunction.currentVersion,
      // });
    
    // create connect function
    const connectFunction = new cdk.aws_lambda.Function(scope, id + '_connect', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/connect/code.zip')),
      handler: 'index.handler',
      role: role,
      tracing: props.enableXray,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_connect',
      environment: {
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region
      }
    });

    // create disconnect function
    const disconnectFunction = new cdk.aws_lambda.Function(scope, id + '_disconnect', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/disconnect/code.zip')),
      handler: 'index.handler',
      role: role,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_disconnect',
      environment: {
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region
      }
    });

    // create targets generation function
    const targetsFunction = new cdk.aws_lambda.Function(scope, id + '_targets', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/targets/code.zip')),
      handler: 'index.handler',
      role: role,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_targets',
      environment: {
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'TARGET_DELAYED_SECONDS': props.targetsFrequency.toString(),
        'TARGET_PER_BATCH': props.targetsPerBatch.toString(),
      }
    });

    // authorizer lambda function
    const authorizerFunction = new cdk.aws_lambda.Function(scope, id + '_authorizer', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/authorizer/code.zip')),
      handler: 'index.handler',
      role: role,
      tracing: props.enableXray,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_authorizer',
      environment: {
      }
    });

    return [defaultFunction, connectFunction, disconnectFunction, authorizerFunction, targetsFunction]
  }

  createLogicFunction(scope: Construct, id: string, role: cdk.aws_iam.Role, props: any){
    // create logic function
    const logicFunction = new cdk.aws_lambda.Function(scope, id + '_logic', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/logic/code.zip')),
      handler: 'index.handler',
      role: role,
      tracing: props.enableXray,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_logic',
      environment: {
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'TARGET_DELAYED_SECONDS': props.targetsFrequency.toString(),
        'TARGET_PER_BATCH': props.targetsPerBatch.toString(),
        'STATE_MACHINE_ARN': props.stateMachineArn
      }
    });

    return logicFunction;

  }

}
