#!/usr/bin/env bash

LAMBDA_FUNCTION_NAME="SanFranciscoQuiz"

rm index.zip
cd lambda
zip -r -X -x *aws-sdk* -9 ../index.zip *
cd ..
aws lambda update-function-code --function-name "${LAMBDA_FUNCTION_NAME}" --zip-file fileb://index.zip
