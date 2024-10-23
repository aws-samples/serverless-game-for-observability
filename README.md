# Demo Game for Demonstrating Serverless Observability

This repository is planned for demonstrating serverless observability in re:Invent 2024 COP408 "Coding for serverless observability". It can also be used as example for implementing game with serverless solution, as well as observability for serverless applications.

Feature Tags: Observability, Serverless, Gaming, Games, CDK.

## Introduction

The demo game consists of 2 components: frontend GUI in unity3d and server side implementation on lambda functions with SQS as messaging queue and DynamoDB as game data storage. Server side exposes websocket endpoints via API Gateway and embedded the logic code in lambda functions.

Players connect to backend via "$connect" endpoint from API Gateway. One player creates a game room and another player can join the game room. When a game room has 2 players correlated, the game will start. While playing the game, bother players can trigger shooting actions from the web UI and the action will be handled by the "$default" endpoint. It updates the status in DynamoDB and send an event to the SQS, with event driven architecture design, the message will be processed by "logic" lambda function. In the logic function, it calculates the hitting targets, update the scores, remaining targets in DynamoDB and push the result back to the game UI via websocket.

As long as the game finished or any of the player connections disrupted, the "$disconnect" endpoint will be triggerd and game data will be wriped out.

More information can be found on the architecture below and code in the repository.

## Deployment

Deployment options are documented in this section.

Environment Variables:

1. enable active tracing for Lambda, StepFucntion

    ```shell
    export ENABLE_XRAY=ACTIVE
    ```

2. enable X-Ray in code

    ```shell
    export ENABLE_XRAY_SDK=true
    ```

3. change log level

   ```shell
   export LOG_LEVEL=DEBUG
   ```

4. use powertool

    ```shell
    export USE_POWERTOOL=true
    ```

5. use ADOT layer

    ```shell
    export USE_ADOT_LAYER=true
    ```

6. emit metrics from logic function

    ``` shell
    export EMIT_SHOOTING_METRIC=true
    ```

7. inject logic error

    ``` shell
    export INJECT_SHOOTING_ERROR=true
    ```

8. if lambda function throw error when encounter planned issue. The game by default is injected with an error in lambda function `logic`. With the environment set as 'true'

    ``` shell
    export THROW_LOGIC_ERROR=true
    ```

### Deploy with CDK

Step 1: packaging the lambda functions to zip archive

Step 2: Setup environment values for your specific purpose

Step 3: Deploy uing CDK command

When you change the code in lambda functions, do not forget to re-package the zip archive before applying CDK update.

## Go through the demo

1. When you do not manipulate any environment variables. The game can be played without error. No trace is enabled, log level set to error and no custom metrics found. This mode can be used for game play in a demo expo booth.

2. The story can be started with game with error existing (`export INJECT_SHOOTING_ERROR=true` and `export THROW_LOGIC_ERROR=true`). Game is blocked after some shots but you do not have any idea how to troubleshoot.

3. Enable the trace (CloudWatch Traces aka X-Ray) using `export ENABLE_XRAY=ACTIVE` should be the first idea how to proceed in this situation. Update the CDK stack behaves the same as to having `Active Tracing` enabled from web console.

4. Basic calling chains are established in CloudWatch Traces. You should be able to see the Lambda function where the error is thrown. However, without having all components presented in the trace, it is still not easy to judge the root cause. `export ENABLE_XRAY_SDK=true` with this environment set and CDK stack updated, it can use X-Ray SDK to wrap the service client in the Lambda code. And SQS / DynamoDB will be presented in the CloudWatch Traces.

    ``` javascript
    const AWS = process.env.ENABLE_XRAY_SDK == "true" ? AWSXRay.captureAWS(require('aws-sdk')) : require('aws-sdk')
    ```

5. With the complete trace information in CloudWatch, you should be able to tell the error comes from `logic` function. It is possible to resolve the code with the environment `export THROW_LOGIC_ERROR=false`. Do not forget to `purge` SQS queue using the commands below.

    ``` shell
    output=`aws cloudformation describe-stacks \
    --stack-name ServerlessGameDemoStack \
    --query "Stacks[].Outputs[]" \
    --output json`
    dlq=echo $output | jq '.[] | select( .OutputKey | contains("fifoUrlDlq"))' | jq -r .OutputValue
    aws sqs purge-queue --queue-url $dlq

    gamequeue=echo $output | jq '.[] | select( .OutputKey | contains("fifoUrl"))' | jq -r .OutputValue
    aws sqs purge-queue --queue-url $gamequeue
    ```

6. Play with the game again, you should find it is still not completely working. Shooting animation looks fine but sometimes it does not behave properly when hitting the targets. Trace does not show error anymore. Now we want to check the log. `export LOG_LEVEL=DEBUG` can change the log to debug level.

7. Check the trace log correlation and try to find all information using trace IDs. However, log is only available in the first and last system log. It may not be very helpful. We want to make sure trace ID is presented in each log message. It is time to talk about powertool.

    Use environment variables `export USE_POWERTOOL=true` to switch logging from Lambda default to powertool. And with this new change updated in CDK stack, you should be able to see the trace ID ingested in each log message.

    With the complete debug log, you should be able to find the root cause and it can be fixed by updating the environment variable `export INJECT_SHOOTING_ERROR=false`

8. Playing the game again, we do not see much statistics data from the game. Let's try to collect some data from the game. It is possible to emit value when event is triggered (e.g. shooting event). We can setup the ADOT layer to collect this data and present it in the dashboard. By default Amazon managed Prometheus and Grafana are deployed already with the CDK stack and we only need to enable the ADOT layer and update the ADOT layer configuration to route the data to the right target. Update the CDK with the environment `export USE_ADOT_LAYER=true` on.
    Play the game again. Now you should see the statistics values stored in the Prometheus and visible from Grafana.

9. All code changes are done and the we are almost through the demo. There is still one scenario we would like to emphasize, the manual instrumentation possibility in Lambda function. The `target` function is implemented in Golang in custom runtime. Check the code and try to understand how manual instrumentation works.

### Environment Values

Environment Variables:

1. enable active tracing for Lambda, StepFucntion

    ```shell
    export ENABLE_XRAY=ACTIVE
    ```

2. enable X-Ray in code

    ```shell
    export ENABLE_XRAY_SDK=true
    ```

3. change log level

   ```shell
   export LOG_LEVEL=DEBUG
   ```

4. use powertool

    ```shell
    export USE_POWERTOOL=true
    ```

5. use ADOT layer

    ```shell
    export USE_ADOT_LAYER=true
    ```

6. emit metrics from logic function

    ``` shell
    export EMIT_SHOOTING_METRIC=true
    ```

7. inject logic error

    ``` shell
    export INJECT_SHOOTING_ERROR=true
    ```

8. if lambda function throw error when encounter planned issue. The game by default is injected with an error in lambda function `logic`. With the environment set as 'true'

    ``` shell
    export THROW_LOGIC_ERROR=true
    ```

## Clean up

``` shell
cdk destroy --all --force
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
