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
const enableLog = process.env['LOG_ENABLED'] || false

exports.handler = function (event, context, callback) {
  console.log(event)
  if (event['requestContext']) {
    handleAction(event)
  } else if (event['Records']) {
    handleMessages(event)
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'hello' })
  }
  console.log('response', response)
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
        console.log('create')
        createRoom(connectionId, request['room'])
        break
      case 'join':
        console.log('join')
        joinRoom(connectionId, request['room'], domain, stage)
        break
      case 'shoot':
        console.log('shoot')
        proceedShooting(request, connectionId, domain, stage)
        break
      default:
        console.log('default')
        break
    }
  } else {
    console.log(request)
    console.log(isNull(request))
    console.log(isNull(request.action))
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
          console.log('new targets')
          proceedNewTargets(request.data)
          break
        case 'stop':
          console.log('stop')
          proceedStop(request.data)
          break
        default:
          console.log('default')
          break
      }
    } else {
      console.log(request)
      console.log(isNull(request))
      console.log(isNull(request.action))
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
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      console.log(err, result)
      if (!err) {
        console.log('proceedStop ok')
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
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      console.log(err, result)
      if (!err) {
        console.log('proceedNewTargets ok')
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
  // const randomNumber = Math.random();
  // if (randomNumber > 0.5) {
  //   console.error("error here!")
  //   shootInfo["miss"] = "true"
  // }
  async.waterfall(
    [
      function (callback) {
        sendFifoMessage(
          sqs,
          fifoQueueUrl,
          JSON.stringify(shootInfo),
          function (err, data) {
            if (err) {
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      console.log(err, result)
      if (!err) {
        console.log('proceedShooting ok')
      }
    }
  )
}

function createRoom (connectionId, roomName) {
  async.waterfall(
    [
      function (callback) {
        console.log('update player table')
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
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        console.log('update session table')
        updateRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomName },
            connectionIds: { S: JSON.stringify([connectionId]) }
          },
          function (err, data) {
            if (err) {
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      }
    ],
    function (err, result) {
      console.log(err, result)
      if (!err) {
        console.log('create ok')
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
              console.log('data', data.Item)
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
      console.log(err, result)
      if (!err) {
        console.log('join ok')
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
  console.log(args)
}

// createRoom("12345", "yagrxu")
// joinRoom("54321", "yagrxu")
