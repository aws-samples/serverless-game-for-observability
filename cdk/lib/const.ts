import { Tracing, ApplicationLogLevel } from "aws-cdk-lib/aws-lambda";

export class Constants {
    public static readonly stackName = process.env.STACK_NAME || "ServerlessGameDemoStack";
    public static readonly enableXray  = process.env.ENABLE_XRAY ? Tracing[process.env.ENABLE_XRAY as keyof typeof Tracing] : Tracing.DISABLED;
    //cdk.aws_lambda.ApplicationLogLevel.DEBUG
    public static readonly logLevel  = process.env.LOG_LEVEL ? ApplicationLogLevel[process.env.LOG_LEVEL as keyof typeof ApplicationLogLevel] : ApplicationLogLevel.ERROR;
    public static readonly enableXraySdk  = process.env.ENABLE_XRAY_SDK;
    public static readonly targetsFrequency = Number(process.env.TARGETS_FREQUENCY || "6");
    public static readonly targetsPerBatch = Number(process.env.TARGETS_PER_BATCH || "10");
    public static readonly templatePrefixName = process.env.TEMPLATE_PREFIX_NAME || this.stackName;
    public static readonly fifoQueueGroupId = process.env.FIFO_QUEUE_GROUP_ID || "group1";
    public static readonly usePowertool = process.env.USE_POWERTOOL || "false";
    public static readonly useAdotLayer = process.env.USE_ADOT_LAYER || "false";
    public static readonly emitShootingMetric = process.env.EMIT_SHOOTING_METRIC || "false";
    public static readonly throwLogicError = process.env.THROW_LOGIC_ERROR || "false";
    public static readonly injectShootingError = process.env.INJECT_SHOOTING_ERROR || "false";
    public static readonly customDomain = process.env.CUSTOM_DOMAIN || "";
    public static readonly useCustomDomain = Constants.customDomain == "" ? "false" : "true";

    public static readonly enableLambdaInsights = process.env.ENABLE_LAMBDA_INSIGHTS == "" ? "false" : "true";
    public static readonly enableApplicationSignals = process.env.ENABLE_APP_SIGNALS == "" ? "false" : "true";

}