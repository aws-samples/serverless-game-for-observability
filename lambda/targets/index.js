const async = require("async");
const AWSXRay = require("aws-xray-sdk");
const AWS = AWSXRay.captureAWS(require("aws-sdk"));

const delayedQueueUrl = process.env.DELAYED_QUEUE_URL;
const targetsDelayedSecond = process.env.TARGET_DELAYED_SECONDS;
const targetsPerBatch = process.env.TARGET_PER_BATCH;

const defaultRegion = process.env.DEFAULT_REGION;
const sqs = initSqs();

exports.handler = function (event, context, callback) {
    console.log(event);
    const response = {
        statusCode: 200,
        domain: event.domain,
        stage: event.stage,
        ids: event.ids,
        roomId: event.roomId,
    };
    sendDelayedNewTargets(
        {
            targets: JSON.stringify(randomTargets()),
            domain: event.domain,
            stage: event.stage,
            ids: event.ids,
            roomId: event.roomId,
        },
        function (err, data) {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                callback(null, response);
            }
        }
    );
};

function sendDelayedNewTargets(data, callback) {
    console.log("send delayed new targets", data);
    sendDelayedMessage(
        sqs,
        delayedQueueUrl,
        JSON.stringify({
            action: "newtargets",
            data: data,
        }),
        targetsDelayedSecond,
        callback
    );
}

function getRandomFloat(size, accuracy) {
    return ((Math.random() * 2 - 1) * size).toFixed(accuracy) * 1;
}

function randomTargets() {
    ret = [];
    incremental = 0;
    for (let i = 0; i < targetsPerBatch; i++) {
        x = getRandomFloat(5, 2);
        y = getRandomFloat(3, 2);
        ret.push({ x: x, y: y, id: (Date.now() % 1000000) + incremental });
        incremental++;
    }
    return ret;
}

function initSqs() {
    // Set the region
    AWS.config.update({ region: defaultRegion });

    // Create an SQS service object
    return new AWS.SQS({ apiVersion: "2012-11-05" });
}

function sendDelayedMessage(sqs, queueUrl, message, delay, callback) {
    var params = {
        DelaySeconds: delay,
        MessageAttributes: {},
        MessageBody: message,
        QueueUrl: queueUrl,
    };

    sqs.sendMessage(params, function (err, data) {
        callback(err, data);
    });
}
