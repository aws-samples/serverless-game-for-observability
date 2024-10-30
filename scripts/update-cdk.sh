#!/bin/bash

script_dir="$(cd "$(dirname "$0")" && pwd)"
echo "Script directory path: $script_dir"

cd $script_dir/../cdk

cdk deploy --all --require-approval never