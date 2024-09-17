var async = require('async')
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} = require('@aws-sdk/client-apigatewaymanagementapi')

defaultRegion = 'ap-southeast-1'

function initSqs () {
  var AWS = require('aws-sdk')
  // Set the region
  AWS.config.update({ region: defaultRegion })

  // Create an SQS service object
  return new AWS.SQS({ apiVersion: '2012-11-05' })
}

function initDynamoDB () {
  var AWS = require('aws-sdk')
  // Set the region
  AWS.config.update({ region: defaultRegion })

  // Create an SQS service object
  return new AWS.DynamoDB({ apiVersion: '2012-08-10' })
}

function listQueue (sqs, callback) {
  var params = {}
  sqs.listQueues(params, function (err, data) {
    callback(err, data)
  })
}

function sendDelayedMessage (sqs, queueUrl, message, callback) {
  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
    DelaySeconds: 10,
    MessageAttributes: {
      Title: {
        DataType: 'String',
        StringValue: 'The Whistler'
      },
      Author: {
        DataType: 'String',
        StringValue: 'John Grisham'
      },
      WeeksOn: {
        DataType: 'Number',
        StringValue: '6'
      }
    },
    MessageBody: message,
    // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
    // MessageGroupId: "Group1",  // Required for FIFO queues
    QueueUrl: queueUrl
  }

  sqs.sendMessage(params, function (err, data) {
    callback(err, data)
  })
}

function sendFifoMessage (sqs, queueUrl, message, callback) {
  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
    // DelaySeconds: 10,
    MessageAttributes: {
      Title: {
        DataType: 'String',
        StringValue: 'The Whistler'
      },
      Author: {
        DataType: 'String',
        StringValue: 'John Grisham'
      },
      WeeksOn: {
        DataType: 'Number',
        StringValue: '6'
      }
    },
    MessageBody: message,
    MessageDeduplicationId: Math.random() * 100 + '', // Required for FIFO queues
    MessageGroupId: 'Group1', // Required for FIFO queues
    QueueUrl: queueUrl
  }

  sqs.sendMessage(params, function (err, data) {
    callback(err, data)
  })
}

function receiveMessage (sqs, queueUrl, callback) {
  var params = {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 1,
    MessageAttributeNames: ['All'],
    QueueUrl: queueUrl,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0
  }

  sqs.receiveMessage(params, function (err, data) {
    callback(err, data)
  })
}

function deleteMessage (sqs, queueUrl, receiptHandle, callback) {
  var deleteParams = {
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle
  }
  sqs.deleteMessage(deleteParams, function (err, data) {
    callback(err, data)
  })
}

function updateRecord (ddb, tableName, content, callback) {
  var params = {
    TableName: tableName,
    Item: content
  }

  // Call DynamoDB to add the item to the table
  ddb.putItem(params, function (err, data) {
    callback(err, data)
  })
}

function readRecord (ddb, tableName, keys, callback) {
  var params = {
    TableName: tableName,
    Key: keys
  }

  // Call DynamoDB to add the item to the table
  ddb.getItem(params, function (err, data) {
    callback(err, data)
  })
}

function deleteRecord (ddb, tableName, keys, callback) {
  var params = {
    TableName: tableName,
    Key: keys
  }

  // Call DynamoDB to add the item to the table
  ddb.deleteItem(params, function (err, data) {
    callback(err, data)
  })
}

function deleteRecords (ddb, tableName, keys, callback) {
  var params = {
    RequestItems: {}
  }
  params.RequestItems[tableName] = []
  for (i = 0; i < keys.length; i++) {
    params.RequestItems[tableName].push({
      DeleteRequest: {
        Key: keys[i]
      }
    })
  }

  // Call DynamoDB to add the item to the table
  ddb.batchWriteItem(params, function (err, data) {
    callback(err, data)
  })
}

function testSqs () {
  sqs = initSqs()
  async.waterfall(
    [
      function (callback) {
        listQueue(sqs, function (err, data) {
          if (err) {
            callback(err, null)
          }
          callback(
            null,
            'https://sqs.ap-southeast-1.amazonaws.com/613477150601/game-demo-deadletter.fifo'
          )
        })
      },
      function (queueUrl, callback) {
        if (queueUrl.endsWith('.fifo')) {
          sendFifoMessage(sqs, queueUrl, 'hello world', function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log('FIFO', queueUrl, data)
              callback(null, queueUrl)
            }
          })
        } else {
          sendDelayedMessage(
            sqs,
            queueUrl,
            'hello world',
            function (err, data) {
              if (err) {
                callback(err, null)
              } else {
                console.log(queueUrl, data)
                callback(null, queueUrl)
              }
            }
          )
        }
      },
      function (queueUrl, callback) {
        receiveMessage(sqs, queueUrl, function (err, data) {
          if (err) {
            callback(err, 'error')
          } else if (data.Messages) {
            console.log(data.Messages)
            callback(null, queueUrl, data.Messages[0].ReceiptHandle)
          } else {
            console.log(data)
            callback(new Error('no message'), 'no message')
          }
        })
      },
      function (queueUrl, receiptHandle, callback) {
        deleteMessage(sqs, queueUrl, receiptHandle, function (err, data) {
          if (err) {
            console.log('Delete Error', err)
            callback(err, null)
          } else {
            console.log('Message Deleted', data)
            callback(null, 'done')
          }
        })
      }
    ],
    function (err, result) {
      console.log(err)
      console.log(result)
      if (!err) {
        console.log('sqs tested ok')
      }
    }
  )
}

function testDynamoDB () {
  ddb = initDynamoDB()
  async.waterfall(
    [
      function (callback) {
        updateRecord(
          ddb,
          'PlayerTable',
          {
            connectionId: { S: '123' },
            roomId: { S: '1234' },
            status: { S: '{"key":"value"}' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        updateRecord(
          ddb,
          'PlayerTable',
          {
            connectionId: { S: '124' },
            roomId: { S: '1234' },
            status: { S: '{"key1":"value1"}' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        updateRecord(
          ddb,
          'PlayerTable',
          {
            connectionId: { S: '123' },
            roomId: { S: '1235' },
            status: { S: '{"key2":"value2"}' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        readRecord(
          ddb,
          'PlayerTable',
          {
            connectionId: { S: '123' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log(data.Item)
              callback(null, data.Item)
            }
          }
        )
      },
      function (data, callback) {
        deleteRecord(
          ddb,
          'PlayerTable',
          {
            connectionId: { S: '123' }
          },
          function (err, data) {
            if (err) {
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data)
            }
          }
        )
      },
      function (data, callback) {
        deleteRecords(
          ddb,
          'PlayerTable',
          [
            {
              connectionId: { S: '123' }
            },
            {
              connectionId: { S: '124' }
            }
          ],
          function (err, data) {
            if (err) {
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
      console.log(err)
      console.log(result)
      if (!err) {
        console.log('ddb tested ok')
      }
    }
  )
}

async function demo () {
  const domain = '70uogn0zz6.execute-api.ap-southeast-1.amazonaws.com'
  const stage = 'demo'
  const connectionId = 'CSvMXctIyQ0CHhQ='
  const callbackUrl = `https://${domain}/${stage}`
  const client = new ApiGatewayManagementApiClient({
    endpoint: callbackUrl,
    region: 'ap-southeast-1'
  })

  const requestParams = {
    ConnectionId: connectionId,
    Data: JSON.stringify({
      type: 'game start',
      msg: '{"targets":[{"x":2, "y":2, "id":123}]}'
    })
  }

  const command = new PostToConnectionCommand(requestParams)

  try {
    await client.send(command)
  } catch (error) {
    console.log(error)
  }

  return {
    statusCode: 200
  }
}

function canHitTarget (x, y, angle, a, b) {
  const slope = Math.tan(angle)
  const y_intercept = y - slope * x
  const distance =
    Math.abs(slope * a - b + y_intercept) / Math.sqrt(slope * slope + 1)
  return distance <= 1
}

// Example usage:
console.log(canHitTarget(0, 0, Math.PI / 4, 1, 1)) // true
console.log(canHitTarget(0, 0, Math.PI / 4, 2, 2)) // false

//testSqs()

//testDynamoDB()

demo()
