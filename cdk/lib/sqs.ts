import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as sqs from 'aws-cdk-lib/aws-sqs'

export class Queues {
    queues: Map<string, string> = new Map();
    constructor(scope: Construct, id: string, props?: any) {
        // create a fifo queue
        const game_queue_dl = new sqs.Queue(scope, 'FifoQueueDl', {
            queueName: id + '-game-demo-dl.fifo',
            fifo: true,
            contentBasedDeduplication: true,
            deliveryDelay: cdk.Duration.seconds(0)
        })

        const demoDLQ: sqs.DeadLetterQueue = {
            maxReceiveCount: 10,
            queue: game_queue_dl
        }

        const game_queue = new sqs.Queue(scope, 'GameFifoQueue', {
            queueName: id + '-game-demo.fifo',
            fifo: true,
            contentBasedDeduplication: true,
            deadLetterQueue: demoDLQ,
            deliveryDelay: cdk.Duration.seconds(0)
        })

        const target_queue_dl = new sqs.Queue(scope, 'TargetQueueDl', {
            queueName: id + '-game-demo-delay-dl',
            // contentBasedDeduplication: true,
            deliveryDelay: cdk.Duration.seconds(1)
        })

        const targetDLQ: sqs.DeadLetterQueue = {
            maxReceiveCount: 10,
            queue: target_queue_dl
        }

        const target_queue = new sqs.Queue(scope, 'GameDelayQueue', {
            queueName: id + '-game-demo-delay',
            maxMessageSizeBytes: 2048,
            receiveMessageWaitTime: cdk.Duration.seconds(10),
            retentionPeriod: cdk.Duration.days(1),
            deadLetterQueue: targetDLQ,
            deliveryDelay: cdk.Duration.seconds(5)
        })

        this.queues.set("game_queue", game_queue.queueUrl)
        this.queues.set("target_queue", target_queue.queueUrl)
    }

    // function to return queues
    getQueues(): Map<string, string> {
        return this.queues
    }
}