#!/bin/bash

script_dir="$(cd "$(dirname "$0")" && pwd)"
echo "Script directory path: $script_dir"

cd "$script_dir/../lambda"

cd connect
npm install
zip -r code.zip .


cd ../disconnect
npm install
zip -r code.zip .

cd ../default
npm install
zip -r code.zip .

cd ../logic
npm install
zip -r code.zip .

cd ../targets
make

cd ../authorizer
zip -r code.zip .
