import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';


export class StepFunction {
    constructor ( scope : Construct,  id: string, functionArn: string, loop: number ){
        let chain = new sfn.Wait(scope, 'Wait', {time: sfn.WaitTime.duration(cdk.Duration.seconds(8))})
        .next(new tasks.LambdaInvoke(scope, 'Target', {
            lambdaFunction: lambda.Function.fromFunctionArn(scope, 'TargetsFunction', functionArn),
            outputPath: '$.Payload',
            retryOnServiceExceptions: true
        }));

        for (let i = 1; i < loop; i ++) {
            chain = chain.next(new sfn.Wait(scope, `Wait${i}`, {time: sfn.WaitTime.duration(cdk.Duration.seconds(8))})).next(new tasks.LambdaInvoke(scope, `Target${i}`, {
                lambdaFunction: lambda.Function.fromFunctionArn(scope, `TargetsFunction${i}`, functionArn),
                outputPath: '$.Payload',
                retryOnServiceExceptions: true
            }));
        }

        const stateMachine = new sfn.StateMachine(scope, 'GameStateMachine', {
            stateMachineName: id + "-my-state-machine",
            definitionBody: 
            sfn.DefinitionBody.fromChainable(chain),
        })

        // Assign the IAM role to the Step Function state machine
        stateMachine.role.addToPrincipalPolicy(
            new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [functionArn],
            }),
    );
    
    }
}

