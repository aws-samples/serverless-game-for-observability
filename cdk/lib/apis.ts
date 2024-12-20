import * as cdk from 'aws-cdk-lib';
import { AdotLambdaExecWrapper, AdotLambdaLayerGenericVersion, AdotLayerVersion, FunctionProps, IFunction, Tracing, LambdaInsightsVersion } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { StepFunction } from './step-functions';
import path = require('path');
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';


export class LambdaAPIs {

  lambdaFunctions: any;

  constructor(scope: Construct, id: string, props?: any) {
        
    const lambdaRole = this.createLambdaRoles(scope, id);

    this.createFunctions(scope, id, lambdaRole, props);
    
    this.createApiGateway(scope, id, this.lambdaFunctions['default'], this.lambdaFunctions['connect'], this.lambdaFunctions['disconnect'], this.lambdaFunctions['authorizer'], props);

    const stepFunction = new StepFunction(scope, id, this.lambdaFunctions['targets'].functionArn, props);

    props['stateMachineArn'] = stepFunction.stateMachineArn;
    
    this.lambdaFunctions['logic'] = this.createLogicFunction(scope, id, lambdaRole, props);

  }

  // function to create API Gateway
  createApiGateway(scope: Construct, id: string, defaultFunction: IFunction, connectFunction: IFunction, disconnectFunction: IFunction, authorizerFunction: IFunction, props: any) {
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
    // create stage for api gateway integration
    const demoStage = new cdk.aws_apigatewayv2.WebSocketStage(scope, id + '_GameApi_Stage', {
      webSocketApi: api,
      stageName: 'demo',
      autoDeploy: true,
    });

    //  create custom domain
    if(props.customDomain != "") {
      const subDomain:string = props.customDomain;
      // create hosted zone from existing domain in route53
      const hostedZone = cdk.aws_route53.HostedZone.fromLookup(scope, id + '_GameApi_HostedZone', { domainName: subDomain.slice(subDomain.indexOf(".") + 1) });
      // create CName record from hosted zone
      
      // create certificate for custom domain
      const certificate = new cdk.aws_certificatemanager.Certificate(scope, id + '_GameApi_Certificate', {
        domainName: subDomain,
        validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(hostedZone),
      });
      const apiCustomDomain = new cdk.aws_apigatewayv2.DomainName(scope, id + '_GameApi_Domain', {
        domainName: subDomain,
        certificate: certificate,
      });
      //create API mapping
      const apiMapping = new cdk.aws_apigatewayv2.ApiMapping(scope, id + '_GameApi_Mapping', {
        api: api,
        domainName: apiCustomDomain,
        stage: demoStage,
      });

      new cdk.aws_route53.CnameRecord(scope, id + '_GameApi_CnameRecord', { domainName: apiCustomDomain.regionalDomainName, recordName: props.customDomain + ".", zone: hostedZone });
      new cdk.CfnOutput(scope, 'GameApiEndpointAlias', { value: "wss://" + props.customDomain + "?Auth=123" });
    }
    
    // create an output for api gateway endpoint
    new cdk.CfnOutput(scope, 'GameApiEndpoint', { value: demoStage.url + "?Auth=123" });

    const webSocketAuthorizer = new cdk.aws_apigatewayv2.WebSocketAuthorizer(scope, id + '_Authorizer', {
      identitySource: ['route.request.querystring.Auth'],
      type: cdk.aws_apigatewayv2.WebSocketAuthorizerType.LAMBDA,
      webSocketApi: api,
      
      // the properties below are optional
      authorizerName: 'basic-authorizer',
      authorizerUri: `arn:aws:apigateway:${props.region}:lambda:path/2015-03-31/functions/${authorizerFunction.functionArn}/invocations`
    });
    // grant authorization to apigateway 'api' to call the authorization
    authorizerFunction.addPermission('PermitAPIGInvocation', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: api.arnForExecuteApi('*')
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
    lambdaRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AWSStepFunctionsFullAccess'));
    lambdaRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: ['*']
    }));
    lambdaRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['execute-api:Invoke'],
      resources: ['*']
    }));
    lambdaRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['aps:*'],
      resources: ['*']
    }));

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
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_default',
      environment: {
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'USE_POWERTOOL': props.usePowertool,
        'INJECT_SHOOTING_ERROR': props.injectShootingError
      }
    });

    this.enableLambdaInsights(scope, defaultFunction, props);
    this.enableAppSignals(scope, defaultFunction, props);

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
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_connect',
      environment: {
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'USE_POWERTOOL': props.usePowertool
      }
    });

    this.enableLambdaInsights(scope, connectFunction, props);
    this.enableAppSignals(scope, connectFunction, props);

    // create disconnect function
    const disconnectFunction = new cdk.aws_lambda.Function(scope, id + '_disconnect', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/disconnect/code.zip')),
      handler: 'index.handler',
      role: role,
      timeout: cdk.Duration.seconds(10),
      tracing: props.enableXray,
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      memorySize: 1024,
      functionName: id + '_disconnect',
      environment: {
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'USE_POWERTOOL': props.usePowertool
      }
    });

    this.enableLambdaInsights(scope, disconnectFunction, props);
    this.enableAppSignals(scope, disconnectFunction, props);

    let targetsProps: Record<string, any> = {
      runtime: cdk.aws_lambda.Runtime.PROVIDED_AL2023,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/targets/code.zip')),
      handler: 'bootstrap',
      role: role,
      tracing: props.enableXray,
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_targets',
      environment: {
        'ENABLE_XRAY': props.enableXray,
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'USE_POWERTOOL': props.usePowertool,
        'TARGET_DELAYED_SECONDS': props.targetsFrequency.toString(),
        'TARGET_PER_BATCH': props.targetsPerBatch.toString(),
      },
    };

    if (props.enableXray == Tracing.ACTIVE) {
      targetsProps.adotInstrumentation = {
        layerVersion: AdotLayerVersion.fromGenericLayerVersion(AdotLambdaLayerGenericVersion.LATEST),
        execWrapper: AdotLambdaExecWrapper.REGULAR_HANDLER,
      };
      targetsProps.environment['OPENTELEMETRY_COLLECTOR_CONFIG_FILE'] = '/var/task/config.yaml';
      targetsProps.environment['APS_ENDPOINT'] = props.apsEndpoint;
    }
    // create targets generation function
    const targetsFunction = new cdk.aws_lambda.Function(scope, id + '_targets', targetsProps as FunctionProps);

    this.enableLambdaInsights(scope, targetsFunction, props);

    // authorizer lambda function
    const authorizerFunction = new cdk.aws_lambda.Function(scope, id + '_authorizer', {
      runtime: cdk.aws_lambda.Runtime.PYTHON_3_12,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/authorizer/code.zip')),
      handler: 'index.handler',
      role: role,
      tracing: props.enableXray,
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_authorizer',
      environment: {
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'USE_POWERTOOL': props.usePowertool
      }
    });

    this.enableLambdaInsights(scope, authorizerFunction, props);
    this.enableAppSignals(scope, authorizerFunction, props);

    defaultFunction.addEventSourceMapping('DefaultFunctionEventSourceMapping', {
      eventSourceArn: props.targetQueueArn,
      enabled: true,
      batchSize: 1,
    })
    this.lambdaFunctions = {
      'default': defaultFunction,
      'connect': connectFunction,
      'disconnect': disconnectFunction,
      'authorizer': authorizerFunction,
      'targets': targetsFunction
    }
  }

  createLogicFunction(scope: Construct, id: string, role: cdk.aws_iam.Role, props: any){
    // create logic function
    const logicFunction = new cdk.aws_lambda.Function(scope, id + '_logic', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
      code: cdk.aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda/logic/code.zip')),
      handler: 'index.handler',
      role: role,
      architecture: cdk.aws_lambda.Architecture.X86_64,
      tracing: props.enableXray,
      applicationLogLevelV2: props.logLevel,
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
      functionName: id + '_logic',
      environment: {
        'ENABLE_XRAY_SDK': props.enableXraySdk,
        'DELAYED_QUEUE_URL': props.targetQueue,
        'FIFO_QUEUE_URL': props.gameQueue,
        'FIFO_QUEUE_GROUP_ID': props.gameQueueId,
        'PLAYER_TABLE_NAME': props.playerTable,
        'GAME_SESSION_TABLE_NAME': props.sessionTable,
        'DEFAULT_REGION': props.region,
        'TARGET_DELAYED_SECONDS': props.targetsFrequency.toString(),
        'TARGET_PER_BATCH': props.targetsPerBatch.toString(),
        'STATE_MACHINE_ARN': props.stateMachineArn,
        'USE_POWERTOOL': props.usePowertool,
        'EMIT_SHOOTING_METRIC': props.emitShootingMetric,
        'THROW_LOGIC_ERROR': props.throwLogicError,
        'USE_CUSTOM_DOMAIN': props.useCustomDomain
      }
    });
    
    if(props.useAdotLayer == 'true'){
      logicFunction.addLayers(cdk.aws_lambda.LayerVersion.fromLayerVersionArn(scope, 'ADOTLayer', `arn:aws:lambda:${props.region}:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4`))
      logicFunction.addEnvironment('AWS_LAMBDA_EXEC_WRAPPER', '/opt/otel-handler')
      logicFunction.addEnvironment('OPENTELEMETRY_COLLECTOR_CONFIG_FILE', '/var/task/config.yaml')
      logicFunction.addEnvironment('OTEL_PROPAGATORS', 'tracecontext,baggage,xray')
      logicFunction.addEnvironment('APS_ENDPOINT', props.apsEndpoint)
    }

    this.enableLambdaInsights(scope, logicFunction, props);
    this.enableAppSignals(scope, logicFunction, props);

    logicFunction.addEventSourceMapping('LogicFunctionEventSourceMapping', {
      eventSourceArn: props.gameQueueArn,
      enabled: true,
      batchSize: 1,
    })
    return logicFunction;

  }

  enableLambdaInsights(scope: Construct, func: cdk.aws_lambda.Function, props?: any) {
    if (props.enableLambdaInsights == "true") {
      // arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:53
      func.addLayers(lambda.LayerVersion.fromLayerVersionArn(
        scope,
        func.functionName + "-insights",
        LambdaInsightsVersion.VERSION_1_0_317_0.layerVersionArn
      ));
    }
  }

  enableAppSignals(scope: Construct, func: cdk.aws_lambda.Function, props?: any) {
    if (props.enableApplicationSignals == "true") {
      //arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroJs:5
      func.addLayers(lambda.LayerVersion.fromLayerVersionArn(
        scope,
        func.functionName + "-appsignals",
        'arn:aws:lambda:' + props.region + ':615299751070:layer:AWSOpenTelemetryDistroJs:5'
      ));
      func.addEnvironment('AWS_LAMBDA_EXEC_WRAPPER', '/opt/otel-instrument')
    }
  }

  getFunctions(): any {
    return this.lambdaFunctions;
  }
}
