#!/bin/bash

script_dir="$(cd "$(dirname "$0")" && pwd)"
echo "Script directory path: $script_dir"

cd $script_dir/../cdk

echo "purge SQS Queue"

aws sqs purge-queue --queue-url `aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs" | jq -rc '.[] | select(.OutputKey=="fifoUrl") | .OutputValue '`

cdk deploy --all --require-approval never