#!/bin/bash

cd lambda

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
npm install
zip -r code.zip .

cd ../authorizer
zip -r code.zip .
