import { Tracing } from "aws-cdk-lib/aws-lambda";

export class Constants {
    public static readonly enableXray  = process.env.ENABLE_XRAY ? Tracing[process.env.ENABLE_XRAY as keyof typeof Tracing] : Tracing.DISABLED;
    public static readonly targetsFrequency = Number(process.env.TARGETS_FREQUENCY || "10");
    public static readonly targetsPerBatch = Number(process.env.TARGETS_PER_BATCH || "10");
    public static readonly templatePrefixName = process.env.TEMPLATE_PREFIX_NAME || "aws-serverless-game-demo01";
    public static readonly fifoQueueGroupId = process.env.FIFO_QUEUE_GROUP_ID || "group1";
}