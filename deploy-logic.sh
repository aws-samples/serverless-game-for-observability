#!/bin/bash

script_dir="$(cd "$(dirname "$0")" && pwd)"
echo "Script directory path: $script_dir"

cd "$script_dir/lambda"

cd logic
# npm install
zip -r code.zip .

cd ../default
# npm install
zip -r code.zip .

cd ../../cdk

cdk deploy --all --require-approval never