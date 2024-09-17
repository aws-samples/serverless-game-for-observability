#!/bin/bash

cd lambda

cd connect
npm install
zip -r ../../tf/connect.zip .


cd ../disconnect
npm install
zip -r ../../tf/disconnect.zip .

cd ../default
npm install
zip -r ../../tf/default.zip .

cd ../logic
npm install
zip -r ../../tf/logic.zip .

cd ../targets
npm install
zip -r ../../tf/targets.zip .

cd ../authorizer
zip -r ../../tf/authorizer.zip .