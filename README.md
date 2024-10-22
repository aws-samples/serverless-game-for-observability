# Game for Demonstrating Serverless Observability

TODO: Fill this README out!

Be sure to:

* Change the title in this README
* Edit your repository description on GitHub

## Purpose and Features

This repository is planned for demonstrating serverless observability in re:Invent 2024 COP408 "Coding for serverless observability". It can also be used as content for serverless implementation of Game, as well as observability for serverless applications.

Feature Tags: Observability, Serverless, Gaming, Games, CDK.

## Introduction

## Deployment and Play

### Deploy with CDK

## Go through the demo

### Default Behaviors

### Environment Values

## Clean up

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.


Variables:

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
