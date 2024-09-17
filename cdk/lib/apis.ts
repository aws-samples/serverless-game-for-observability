import * as cdk from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { StepFunction } from './step-functions';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaAPIs {

  lambdaFunctions: Map<string, cdk.aws_lambda.Function> = new Map();

  constructor(scope: Construct, id: string, props?: any) {
        
    const lambdaRole = this.createLambdaRoles(scope, id)

    const functions = this.createFunctions(scope, id, lambdaRole)
    
    this.createApiGateway(scope, id, functions[0])
    new StepFunction(scope, id, functions[1].functionArn, props.targetsFrequency)

  }

  // function to create API Gateway
  createApiGateway(scope: Construct, id: string, defaultFunction: IFunction) {
    const defaultIntegration = new cdk.aws_apigatewayv2_integrations.WebSocketLambdaIntegration(id + '_GameApi_integration_default', defaultFunction)
    const api = new cdk.aws_apigatewayv2.WebSocketApi(scope, id + '_GameApi', {
      apiName: id + '_GameApi',
      routeSelectionExpression: '$request.body.action',
      defaultRouteOptions: {
          integration: defaultIntegration
      }
    });
    // api.addRoute("$default", {
    //   integration: defaultIntegration
    // })
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

  createFunctions(scope: Construct, id: string, role: cdk.aws_iam.Role)
  {
    // default lambda function
    const defaultFunction = new cdk.aws_lambda.Function(scope, id + '_default', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/default/code.zip')),
      handler: 'index.handler',
      role: role,
      functionName: id + '_default'
    });
    // create alias for the default Function
      // new cdk.aws_lambda.Alias(scope, 'DefaultFunctionAlias', {
      //   aliasName: 'prod',
      //   version: defaultFunction.currentVersion,
      // });
    // create targets generation function
    const targetsFunction = new cdk.aws_lambda.Function(scope, id + '_targets', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/targets/code.zip')),
      handler: 'index.handler',
      role: role,
      functionName: id + '_targets',
      environment: {
        'TABLE_NAME': 'GameDemoTargets'
      }
    });

    return [defaultFunction, targetsFunction]
  }

}
