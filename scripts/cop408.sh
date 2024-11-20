# playable stack
# export STACK_NAME=serverless-observability-demo
# export CUSTOM_DOMAIN=play.awsdemo.fun
# export AWS_DEFAULT_REGION=us-west-2
# server is wss://play.awsdemo.fun?Auth=123

# cop408 stack default setup
export STACK_NAME=cop408
export CUSTOM_DOMAIN=cop408.awsdemo.fun
export AWS_DEFAULT_REGION=us-east-1


export INJECT_SHOOTING_ERROR=true
export THROW_LOGIC_ERROR=true

# first update
export ENABLE_XRAY=ACTIVE
export ENABLE_XRAY_SDK=true

# second update
export LOG_LEVEL=DEBUG  

# thrid update
export USE_POWERTOOL=true

# fourth update
export INJECT_SHOOTING_ERROR=false
export THROW_LOGIC_ERROR=false


# fifth update
export TARGETS_PER_BATCH=30
export USE_ADOT_LAYER=true
export EMIT_SHOOTING_METRIC=true