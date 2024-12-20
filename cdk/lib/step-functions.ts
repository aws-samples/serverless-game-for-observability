import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Tracing } from 'aws-cdk-lib/aws-lambda';


export class StepFunction {

    stateMachineArn:string

    constructor ( scope : Construct,  id: string, functionArn: string, props: any){
        let chain = new sfn.Wait(scope, 'Wait', {time: sfn.WaitTime.duration(cdk.Duration.seconds(0))})
        .next(new tasks.LambdaInvoke(scope, 'Target', {
            lambdaFunction: lambda.Function.fromFunctionArn(scope, 'TargetsFunction', functionArn),
            outputPath: '$.Payload',
            retryOnServiceExceptions: true
        }));

        for (let i = 1; i < props.targetsFrequency; i ++) {
            chain = chain.next(new sfn.Wait(scope, `Wait${i}`, {time: sfn.WaitTime.duration(cdk.Duration.seconds(8))})).next(new tasks.LambdaInvoke(scope, `Target${i}`, {
                lambdaFunction: lambda.Function.fromFunctionArn(scope, `TargetsFunction${i}`, functionArn),
                outputPath: '$.Payload',
                retryOnServiceExceptions: true
            }));
        }

        const stateMachine = new sfn.StateMachine(scope, 'GameStateMachine', {
            stateMachineName: id + "-my-state-machine",
            tracingEnabled: props.enableXray == Tracing.ACTIVE,
            definitionBody: 
            sfn.DefinitionBody.fromChainable(chain),
        })
        this.stateMachineArn = stateMachine.stateMachineArn
        // Assign the IAM role to the Step Function state machine
        stateMachine.role.addToPrincipalPolicy(
            new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [functionArn],
            }),
    );
    }
}

