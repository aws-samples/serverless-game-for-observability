const async = require("async");
const AWSXRay = require("aws-xray-sdk");
const AWS = process.env.ENABLE_XRAY_SDK == "true" ? AWSXRay.captureAWS(require('aws-sdk')) : require('aws-sdk')
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { SFNClient, StartExecutionCommand, StopExecutionCommand } = require("@aws-sdk/client-sfn");
const emitShootingMetric = process.env.EMIT_SHOOTING_METRIC== "true" ? true : false

function createCounter(){
    const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
    const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
    const opentelemetry = require('@opentelemetry/api');
    const { Resource } = require('@opentelemetry/resources');
    const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

    // Set the OpenTelemetry diagnostic logger
    // diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

    const metricExporter = new OTLPMetricExporter({});

    // Initialize the AWS Distro for OpenTelemetry
    const meterProvider = new MeterProvider({
        resource: new Resource({
            'service.name': 'random-number-lambda',
        }),
        readers: [new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: 1000,
        })]
    });

    opentelemetry.metrics.setGlobalMeterProvider(meterProvider);
    const meter = meterProvider.getMeter('default')

    // Create an counter to emit random numbers
    return meter.createCounter('random_number', {
        description: 'A counter for random numbers'
    });
}

// Create an counter to emit random numbers
const randomNumberCounter = emitShootingMetric ? createCounter() : null;


function updateData(playerId){
    if( ! emitShootingMetric ) {
        return
    }
    const randomNumber = Math.random() * 100;
    // Record the metric by adding the random number to the counter
    randomNumberCounter.add(randomNumber, { player: playerId + "" });
    console.log(`should emitted random number: ${randomNumber}`);

}


// log section
const { Logger } = require('@aws-lambda-powertools/logger');


const logger = new Logger({ serviceName: 'serverless-game-logic' });

const usePowertool = process.env.USE_POWERTOOL == "true"? true : false;
console.log("powertool enabled is ", usePowertool)

function logDebug(message){
    if(usePowertool){
        logger.debug(message);
    }
    else {
        console.debug(message);
    }
}

function logInfo(message){
    if (usePowertool){
        logger.info(message);
    }
    else {
        console.info(message);
    }
}

function logError(message){
    if (usePowertool){
        logger.error(message);
    }
    else {
        console.error(message);
    }
}



const laserWidth = process.env.LaserWidth || 0.6;
const mosWidth = process.env.MosquetoWidth || 1.0;

const delayedQueueUrl = process.env.DELAYED_QUEUE_URL;
const targetsPerBatch = process.env.TARGET_PER_BATCH;
const playerTableName = process.env.PLAYER_TABLE_NAME;
const gameSessionTableName = process.env.GAME_SESSION_TABLE_NAME;
const defaultRegion = process.env.DEFAULT_REGION;
const stateMachineArn = process.env.STATE_MACHINE_ARN;
const sqs = initSqs();
const ddb = initDynamoDB();
const sfn = initSFN();

exports.handler = function (event, context) {
    logInfo('Welcome to the logic function');
    logDebug(event);
    records = event["Records"];
    for (let i = 0; i < records.length; i++) {
        record = records[i];
        handleEvent(record);
    }


    const response = {
        statusCode: 200,
        body: JSON.stringify("Hello from Logic!"),
    };
    logInfo('leaving logic function');
    return response;
};

function handleEvent(record) {
    logDebug("record:", record);
    body = JSON.parse(record.body);
    switch (body.action) {
        case "start":
            logDebug("action start");
            startGame(body);
            break;
        case "newtargets":
            logDebug("action newtargets");
            handleNewTargets(body);
            break;
        case "stop":
            logDebug("action stop");
            stopGame(body);
            break;
        case "shoot":
            logDebug("action shoot");
            handleShoot(body);
            break;
        default:
            break;
    }
}

function handleNewTargets(body) {
    logDebug("body", body);
    let request = body.data;
    updatedTargets = null;
    async.waterfall(
        [
            function (callback) {
                logDebug("read targets");
                readRecord(
                    ddb,
                    gameSessionTableName,
                    {
                        roomId: { S: request.roomId },
                    },
                    function (err, data) {
                        if (err) {
                            logError(err);
                            callback(err, null);
                        } else {
                            logDebug(data);
                            callback(null, data.Item);
                        }
                    }
                );
            },
            function (data, callback) {
                if (data.running.S == "false") {
                    callback(new Error("already stopped"), null);
                    return;
                }
                logDebug("update targets");
                updatedTargets = JSON.parse(data.targets.S).concat(JSON.parse(request.targets));
                data.targets.S = JSON.stringify(updatedTargets);
                updateRecord(ddb, gameSessionTableName, data, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data);
                    }
                });
            },
            function (data, callback) {
                sendTargetUpdate(request, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data);
                    }
                });
            },
        ],
        function (err, result) {
            logError(err, result);
            if (!err) {
                logDebug("create ok");
            }
        }
    );
}

function handleShoot(body) {
    shootItem = body;
    logDebug(shootItem);
    updateData(shootItem.player);
    
    async.waterfall(
        [
            function (callback) {
                logDebug("get targets");
                readRecord(
                    ddb,
                    playerTableName,
                    {
                        connectionId: { S: shootItem.connectionId },
                    },
                    function (err, data) {
                        if (err) {
                            logError(err);
                            callback(err, null);
                        } else {
                            logDebug(data);
                            shootItem.player = data.Item.host.N;
                            callback(null, data.Item);
                        }
                    }
                );
            },
            function (data, callback) {
                logDebug(data);
                readRecord(
                    ddb,
                    gameSessionTableName,
                    {
                        roomId: { S: data.roomId.S },
                    },
                    function (err, data) {
                        if (err) {
                            logError(err);
                            callback(err, null);
                        } else {
                            logDebug(data);
                            callback(null, data.Item);
                        }
                    }
                );
            },
            function (data, callback) {
                result = filterHit(JSON.parse(data.targets.S), shootItem);
                existingTargets = result.targets;
                shootItem.hit = result.hit;
                if (result.hit.length > 0) {
                    playerStatus = JSON.parse(data.status.S);
                    playerStatus[shootItem.player] += result.hit.length;
                    data.status.S = JSON.stringify(playerStatus);
                }
                data.targets.S = JSON.stringify(existingTargets);
                dataRecord = data;
                updateRecord(ddb, gameSessionTableName, data, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(dataRecord);
                        callback(null, dataRecord);
                    }
                });
            },
            function (data, callback) {
                shootInfo = shootItem;
                shootInfo.connectionIds = JSON.parse(data.connectionIds.S);
                shootInfo.stage = shootItem.stage;
                shootInfo.domain = shootItem.domain;
                shootInfo.hit = shootItem.hit;
                logDebug("shootInfo", shootInfo);
                updateShoot(shootInfo, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data.Item);
                    }
                });
            },
        ],
        function (err, result) {
            if (!err) {
                logDebug("create ok", result);
            }
            else {
                logError(err);
            }
        }
    );
}

function filterHit(targets, shootInfo) {
    newTargets = [];
    ret = {
        targets: targets,
        hit: [],
    };
    for (let i = 0; i < targets.length; i++) {
        if (canHitTarget(shootInfo.origin.x, shootInfo.origin.y, shootInfo.angle, targets[i].x, targets[i].y)) {
            ret.hit.push(targets[i].id);
        } else {
            newTargets.push(targets[i]);
        }
    }
    ret.targets = newTargets;
    return ret;
}

function canHitTarget(originX, originY, angle, targetX, targetY) {
    var newTargetX = targetX - originX;
    var newTargetY = targetY - originY;
    if (newTargetX == 0 && newTargetY == 0) {
        return true;
    }

    if (newTargetX == 0 && angle == 90) {
        return true;
    }

    if (newTargetY == 0 && (angle == 0 || angle == 180)) {
        return true;
    }

    var distance = Math.sqrt(newTargetX * newTargetX + newTargetY * newTargetY);
    var targetAngle = Math.atan(newTargetY / newTargetX);
    // If the calculated targetAngle is less than 0, it means that the angle is greater than 90 degrees.
    if (targetAngle < 0) {
        targetAngle = Math.PI + targetAngle;
    }
    // Firing angle conversion
    var shootAngle = (angle * Math.PI) / 180;

    var diffAngle = Math.abs(targetAngle - shootAngle);
    // If the angle difference exceeds 90 degrees, it is determined as a miss.
    if (diffAngle >= 0.5 * Math.PI) {
        return false;
    }
    var targetDisToPath = distance * Math.sin(diffAngle);
    return targetDisToPath <= laserWidth / 2 + mosWidth / 2;
}

function startGame(body) {
    body.data.targets = { S: JSON.stringify(randomTargets()) };
    body.data.status = {
        S: JSON.stringify({
            0: 0,
            1: 0,
        }),
    };
    body.data.running = {
        S: "true",
    };
    request = body.data;
    async.waterfall(
        [
            function (callback) {
                logDebug("update targets");
                updateRecord(ddb, gameSessionTableName, body.data, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data);
                    }
                });
            },
            function (data, callback) {
                startStateMachine(
                    stateMachineArn,
                    {
                        targets: JSON.stringify(randomTargets()),
                        domain: body.domain,
                        stage: body.stage,
                        ids: body.data.connectionIds.S,
                        roomId: body.data.roomId.S,
                    },
                    callback
                );
            },
            function (data, callback) {
                logDebug("send delayed stop", data);
                sendDelayedMessage(
                    sqs,
                    delayedQueueUrl,
                    JSON.stringify({
                        action: "stop",
                        data: {
                            domain: body.domain,
                            stage: body.stage,
                            ids: body.data.connectionIds.S,
                            roomId: body.data.roomId.S,
                        },
                    }),
                    60,
                    function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                        }
                    }
                );
            },
            function (data, callback) {
                sendStart(body, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data);
                    }
                });
            },
        ],
        function (err, result) {
            logError(err, result);
            if (!err) {
                logDebug("create ok");
            }
        }
    );
}
function stopGame(body) {
    async.waterfall(
        [
            function (callback) {
                logDebug("get player status", body);
                readRecord(
                    ddb,
                    gameSessionTableName,
                    {
                        roomId: { S: body.data.roomId },
                    },
                    function (err, data) {
                        if (err) {
                            logError(err);
                            callback(err, null);
                        } else {
                            logDebug(data);
                            callback(null, data.Item);
                        }
                    }
                );
            },
            function (data, callback) {
                record = data;
                record.running.S = "false";
                updateRecord(ddb, gameSessionTableName, record, function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, record);
                    }
                });
            },
            function (data, callback) {
                playerStatus = JSON.parse(data.status.S);
                body.data.winner = playerStatus["0"] >= playerStatus["1"] ? 0 : 1;
                sendStop(body, function (err, data) {
                    if (err) {
                        logError(err);
                        callback(err, null);
                    } else {
                        logDebug(data);
                        callback(null, data);
                    }
                });
            },
        ],
        function (data, callback) {
            stopStateMachine(stateMachineArn, callback);
        },
        function (err, result) {
            logError(err, result);
            if (!err) {
                logDebug("create ok");
            }
        }
    );
}

function sendStart(body, callback) {
    const domain = body.domain;
    const stage = body.stage;
    logDebug(domain, stage, body);

    const callbackUrl = `https://${domain}/${stage}`;
    const client = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
    ids = JSON.parse(body.data.connectionIds.S);
    logDebug(ids);
    items = enhanceTargets(ids, JSON.parse(body.data.targets.S), client);
    async.each(items, notifyStart, function (err) {
        if (err) {
            logError(err);
            callback(err, null);
        } else {
            logDebug("sendStart done");
            callback(null, "done");
        }
    });
}

function sendTargetUpdate(request, callback) {
    const domain = request.domain;
    const stage = request.stage;
    logDebug(domain, stage, request);

    const callbackUrl = `https://${domain}/${stage}`;
    const client = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
    ids = JSON.parse(request.ids);
    logDebug(ids);
    items = enhanceTargets(ids, JSON.parse(request.targets), client);
    async.each(items, notifyNewTargets, function (err) {
        if (err) {
            logError(err);
            callback(err, null);
        } else {
            logDebug("sendTargetUpdate done");
            callback(null, "done");
        }
    });
}

function enhanceTargets(ids, targets, client) {
    items = [];
    for (let i = 0; i < ids.length; i++) {
        items.push({
            id: ids[i],
            client: client,
            targets: targets,
        });
    }
    return items;
}

function sendStop(body, callback) {
    data = body.data;
    const domain = data.domain;
    const stage = data.stage;
    logDebug(domain, stage, data);

    const callbackUrl = `https://${domain}/${stage}`;
    const client = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
    ids = JSON.parse(data.ids);
    logDebug(ids);
    items = enhanceStop(ids, data, client);
    async.each(items, notifyStop, function (err) {
        if (err) {
            logError(err);
            callback(err, null);
        } else {
            logDebug("sendStop done");
            callback(null, "done");
        }
    });
}

function enhanceStop(ids, data, client) {
    items = [];
    for (let i = 0; i < ids.length; i++) {
        items.push({
            id: ids[i],
            client: client,
            winner: data.winner,
        });
    }
    return items;
}

function updateShoot(data, callback) {
    logDebug("updateShoot data", data);
    const domain = data.domain;
    const stage = data.stage;
    logDebug(domain, stage, data);

    const callbackUrl = `https://${domain}/${stage}`;
    const client = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
    ids = data.connectionIds;
    logDebug(ids);
    items = enhanceShootInfo(ids, client, data);
    async.each(items, notifyShoot, function (err) {
        if (err) {
            logError(err);
            callback(err, null);
        } else {
            logDebug("updateShoot done");
            callback(null, "done");
        }
    });
}

function enhanceShootInfo(ids, client, data) {
    items = [];
    for (let i = 0; i < ids.length; i++) {
        items.push({
            id: ids[i],
            client: client,
            player: data.player,
            hit: data.hit,
            origin: {
                x: data.origin.x,
                y: data.origin.y,
            },
            angle: data.angle,
        });
    }
    return items;
}

function notifyStart(item, cb) {
    logDebug("notify start", item.targets);
    const requestParams = {
        ConnectionId: item.id,
        Data: JSON.stringify({
            type: "game start",
            msg: JSON.stringify({ targets: item.targets }),
        }),
    };
    const command = new PostToConnectionCommand(requestParams);
    item.client.send(command, function (err, data) {
        logDebug(err, data);
        if (err) {
            return cb(err, null);
        }
        cb(null, data);
    });
}

function notifyNewTargets(item, cb) {
    logDebug(item);
    const requestParams = {
        ConnectionId: item.id,
        Data: JSON.stringify({
            type: "new target",
            msg: JSON.stringify({ targets: item.targets }),
        }),
    };
    const command = new PostToConnectionCommand(requestParams);
    item.client.send(command, function (err, data) {
        logDebug(err, data);
        if (err) {
            return cb(err, null);
        }
        cb(err, data);
    });
}

function notifyStop(item, cb) {
    logDebug(item);
    winner = { winner: item.winner };
    const requestParams = {
        ConnectionId: item.id,
        Data: JSON.stringify({
            type: "game over",
            msg: JSON.stringify(winner),
        }),
    };
    const command = new PostToConnectionCommand(requestParams);
    item.client.send(command, function (err, data) {
        logDebug(err, data);
        if (err) {
            return cb(err, null);
        }
        cb(err, data);
    });
}

function notifyShoot(item, cb) {
    logDebug(item);
    const requestParams = {
        ConnectionId: item.id,
        Data: JSON.stringify({
            type: "player shoot",
            msg: JSON.stringify({
                hit: item.hit,
                player: item.player,
                origin: {
                    x: item.origin.x,
                    y: item.origin.y,
                },
                angle: item.angle,
            }),
        }),
    };
    const command = new PostToConnectionCommand(requestParams);
    item.client.send(command, function (err, data) {
        logDebug(err, data);
        if (err) {
            return cb(err, null);
        }
        cb(err, data);
    });
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

function initSFN() {
    return new SFNClient({ region: defaultRegion });
}

function initDynamoDB() {
    // Set the region
    AWS.config.update({ region: defaultRegion });

    // Create an DynamoDB service object
    return new AWS.DynamoDB({ apiVersion: "2012-08-10" });
}

function updateRecord(ddb, tableName, content, callback) {
    var params = {
        TableName: tableName,
        Item: content,
    };

    ddb.putItem(params, function (err, data) {
        callback(err, data);
    });
}

function readRecord(ddb, tableName, keys, callback) {
    var params = {
        TableName: tableName,
        Key: keys,
    };

    ddb.getItem(params, function (err, data) {
        callback(err, data);
    });
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

function startStateMachine(stateMachineArn, data, callback) {
    var params = {
        stateMachineArn: stateMachineArn,
        input: JSON.stringify(data),
    };
    const command = new StartExecutionCommand(params);
    sfn.send(command, (err, data) => {
        callback(err, data);
    });
}

function stopStateMachine(stateMachineArn, callback) {
    var params = {
        stateMachineArn: stateMachineArn,
    };
    const command = new StopExecutionCommand(params);
    sfn.send(command, (err, data) => {
        callback(err, data);
    });
}
