const async = require('async')
const AWSXRay = require('aws-xray-sdk')
const process = require('process')
const AWS = process.env.ENABLE_XRAY_SDK == "true" ? AWSXRay.captureAWS(require('aws-sdk')) : require('aws-sdk')
const fifoQueueUrl = process.env.FIFO_QUEUE_URL
// const delayedQueueUrl = process.env.DELAYED_QUEUE_URL
const fifoQueueGroupId = process.env.FIFO_QUEUE_GROUP_ID
const playerTableName = process.env.PLAYER_TABLE_NAME
const gameSessionTableName = process.env.GAME_SESSION_TABLE_NAME
const defaultRegion = process.env.DEFAULT_REGION
const sqs = initSqs()
const ddb = initDynamoDB()

const injectShootingError = process.env['INJECT_SHOOTING_ERROR'] == 'true' ? true : false;


// log section
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({ serviceName: 'serverless-game-default' });

const usePowertool = process.env.USE_POWERTOOL == "true" ? true : false;
console.log("powertool enabled is ", usePowertool)

function logDebug(...messages){
    if(usePowertool){
        logger.debug(...messages);
    }
    else {
        console.debug(...messages);
    }
}

function logInfo(...message){
    if (usePowertool){
        logger.info(...message);
    }
    else {
        console.info(...message);
    }
}

function logError(...message){
    if (usePowertool){
        logger.error(...message);
    }
    else {
        console.error(...message);
    }
}


exports.handler = function (event, context, callback) {
  logDebug(event)
  if (event['requestContext']) {
    handleAction(event)
  } else if (event['Records']) {
    handleMessages(event)
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'hello' })
  }
  logDebug('response', response)
  callback(null, response)
}

function handleAction (event) {
  request = JSON.parse(event['body'])
  connectionId = event['requestContext']['connectionId']
  const domain = event.requestContext.domainName
  const stage = event.requestContext.stage
  if (!isNull(request) && !isNull(request['action'])) {
    switch (request['action']) {
      case 'create':
        logDebug('create')
        createRoom(connectionId, request['room'])
        break
      case 'join':
        logDebug('join')
        joinRoom(connectionId, request['room'], domain, stage)
        break
      case 'shoot':
        logDebug('shoot')
        proceedShooting(request, connectionId, domain, stage)
        break
      default:
        logDebug('default')
        break
    }
  } else {
    logDebug(request)
    logDebug(isNull(request))
    logDebug(isNull(request.action))
  }
}

function handleMessages (event) {
  records = event.Records
  for (let i = 0; i < records.length; i++) {
    record = records[i]
    request = JSON.parse(record['body'])
    if (!isNull(request) && !isNull(request['action'])) {
      switch (request['action']) {
        case 'newtargets':
          logDebug('new targets')
          proceedNewTargets(request.data)
          break
        case 'stop':
          logDebug('stop')
          proceedStop(request.data)
          break
        default:
          logDebug('default')
          break
      }
    } else {
      logDebug(request)
      logDebug(isNull(request))
      logDebug(isNull(request.action))
    }
  }
}

function proceedStop (request) {
  async.waterfall(
    [
      function (callback) {
        sendFifoMessage(
          sqs,
          fifoQueueUrl,
          JSON.stringify({
            data: request,
            action: 'stop'
          }),
          function (err, data) {
            if (err) {
              logDebug(err)
              callback(err, null)
            } else {
              logDebug(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      if (!err) {
        logDebug('proceedStop ok')
      }
      else {
        logError(err, result)
      }
    }
  )
}

function proceedNewTargets (request) {
  async.waterfall(
    [
      function (callback) {
        sendFifoMessage(
          sqs,
          fifoQueueUrl,
          JSON.stringify({
            data: request,
            action: 'newtargets'
          }),
          function (err, data) {
            if (err) {
              logDebug(err)
              callback(err, null)
            } else {
              logDebug(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      
      if (!err) {
        logDebug('proceedNewTargets ok')
      }
      else {
        logError(err, result)
      }
    }
  )
}

function proceedShooting (request, connectionId, domain, stage) {
  shootInfo = request
  shootInfo.connectionId = connectionId
  shootInfo.domain = domain
  shootInfo.stage = stage
  // random error
  const randomNumber = Math.random();
  if (injectShootingError && randomNumber > 0.7) {
    logError(randomNumber, " error here! this is the root cause. fix it")
    shootInfo["miss"] = "true"
  }
  async.waterfall(
    [
      function (callback) {
        sendFifoMessage(
          sqs,
          fifoQueueUrl,
          JSON.stringify(shootInfo),
          function (err, data) {
            if (err) {
              logDebug(err)
              callback(err, null)
            } else {
              logDebug(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      if (!err) {
        logDebug('proceedShooting ok')
      }
      else {
        logError(err, result)
      }
    }
  )
}

function createRoom (connectionId, roomName) {
  async.waterfall(
    [
      function (callback) {
        logDebug('update player table')
        updateRecord(
          ddb,
          playerTableName,
          {
            connectionId: { S: connectionId },
            roomId: { S: roomName },
            host: { N: '0' }
          },
          function (err, data) {
            if (err) {
              logDebug(err)
              callback(err, null)
            } else {
              logDebug(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        logDebug('update session table')
        updateRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomName },
            connectionIds: { S: JSON.stringify([connectionId]) }
          },
          function (err, data) {
            if (err) {
              logDebug(err)
              callback(err, null)
            } else {
              logDebug(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      if (!err) {
        logDebug('create ok')
      }
      else {
        logError(err, result)
      }
    }
  )
}

function joinRoom (connectionId, roomName, domain, stage) {
  async.waterfall(
    [
      function (callback) {
        updateRecord(
          ddb,
          playerTableName,
          {
            connectionId: { S: connectionId },
            roomId: { S: roomName },
            host: { N: '1' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        readRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomName }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              callback(null, data.Item)
            }
          }
        )
      },
      function (data, callback) {
        participants = JSON.parse(data['connectionIds']['S'])
        participants.push(connectionId)
        updateRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomName },
            connectionIds: { S: JSON.stringify(participants) }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        readRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomName }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              logDebug('data', data.Item)
              callback(null, data.Item)
            }
          }
        )
      },
      function (data, callback) {
        sendFifoMessage(
          sqs,
          fifoQueueUrl,
          JSON.stringify({
            data: data,
            action: 'start',
            domain: domain,
            stage: stage
          }),
          callback
        )
      }
    ],
    function (err, result) {
      if (!err) {
        logDebug('join ok')
      }
      else {
        logError(err, result)
      }
    }
  )
}

function initDynamoDB () {
  // Set the region
  AWS.config.update({ region: defaultRegion })

  // Create an SQS service object
  return new AWS.DynamoDB({ apiVersion: '2012-08-10' })
}

function updateRecord (ddb, tableName, content, callback) {
  var params = {
    TableName: tableName,
    Item: content
  }

  ddb.putItem(params, function (err, data) {
    callback(err, data)
  })
}

function isNull (value) {
  return value == null
}

function readRecord (ddb, tableName, keys, callback) {
  var params = {
    TableName: tableName,
    Key: keys
  }

  ddb.getItem(params, function (err, data) {
    callback(err, data)
  })
}

function initSqs () {
  // Set the region
  AWS.config.update({ region: defaultRegion })

  // Create an SQS service object
  return new AWS.SQS({ apiVersion: '2012-11-05' })
}

function sendFifoMessage (sqs, queueUrl, message, callback) {
  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
    // DelaySeconds: 10,
    MessageAttributes: {},
    MessageBody: message,
    MessageDeduplicationId: Math.random() * 100 + '', // Required for FIFO queues
    MessageGroupId: fifoQueueGroupId, // Required for FIFO queues
    QueueUrl: queueUrl
  }

  sqs.sendMessage(params, function (err, data) {
    callback(err, data)
  })
}

function log (...args) {
  logDebug(args)
}

// createRoom("12345", "yagrxu")
// joinRoom("54321", "yagrxu")
