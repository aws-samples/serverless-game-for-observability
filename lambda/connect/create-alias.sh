#!/bin/bash

npm install 

zip -r connect.zip .
target_version=$(aws lambda update-function-code --function-name $FUNCTION_NAME	--zip-file fileb://connect.zip --publish | jq -r '.Version')
alias_exists=$(aws lambda get-alias --function-name $FUNCTION_NAME --name $ALIAS_NAME 2>/dev/null)


if [ -z "$alias_exists" ]
then
  echo "Creating alias $ALIAS_NAME for function $FUNCTION_NAME"
  aws lambda create-alias --function-name $FUNCTION_NAME --name $ALIAS_NAME --function-version $target_version
else
  echo "Alias $ALIAS_NAME already exists"
  current_version=$(aws lambda get-alias --function-name $FUNCTION_NAME --name $ALIAS_NAME | jq -r '.FunctionVersion')
  aws deploy create-deployment --application-name connect-app --deployment-group-name connect_deployment_group --revision "{\"revisionType\":\"AppSpecContent\",\"appSpecContent\":{\"content\":\"{\\\"version\\\":0,\\\"Resources\\\":[{\\\"game-demo-connect\\\":{\\\"Type\\\":\\\"AWS::Lambda::Function\\\",\\\"Properties\\\":{\\\"Name\\\":\\\"$FUNCTION_NAME\\\",\\\"Alias\\\":\\\"$ALIAS_NAME\\\",\\\"CurrentVersion\\\":$current_version,\\\"TargetVersion\\\":$target_version}}}]}\"}}"
fi