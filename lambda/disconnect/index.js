const async = require('async')
const AWSXRay = require('aws-xray-sdk')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
// const fifoQueueUrl = process.env.FIFO_QUEUE_URL
// const delayedQueueUrl = process.env.DELAYED_QUEUE_URL
// const fifoQueueGroupId = process.env.FIFO_QUEUE_GROUP_ID
const playerTableName = process.env.PLAYER_TABLE_NAME
const gameSessionTableName = process.env.GAME_SESSION_TABLE_NAME
const defaultRegion = process.env.DEFAULT_REGION

// exports.handler = async function (event) {
//   console.log(event)
//   const response = {
//     statusCode: 200,
//     body: JSON.stringify('Hello from Connect!')
//   }
//   return response
// }

exports.handler = function (event, context, callback) {
  console.log(event)
  connectionId = event.requestContext.connectionId
  cleanup(connectionId)
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Disconnect!')
  }
  console.log('response', response)
  callback(null, response)
}

function cleanup (connectionId) {
  console.log(connectionId)
  ddb = initDynamoDB()
  var roomId = 'xxx'
  async.waterfall(
    [
      function (callback) {
        console.log('read')
        readRecord(
          ddb,
          playerTableName,
          {
            connectionId: { S: connectionId }
          },
          function (err, data) {
            if (err) {
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data.Item)
            }
          }
        )
      },
      function (data, callback) {
        if (!data) {
          callback(new Error('no item found'), null)
          return
        }
        console.log('read')
        roomId = data.roomId.S
        readRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: data.roomId.S }
          },
          function (err, data) {
            if (err) {
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, data.Item)
            }
          }
        )
      },
      function (data, callback) {
        console.log('delete')
        ids = JSON.parse(data.connectionIds.S)
        let keys = []
        for (let i = 0; i < ids.length; i++) {
          keys.push({
            connectionId: { S: ids[i] }
          })
        }
        deleteRecords(ddb, playerTableName, keys, function (err, data) {
          if (err) {
            console.log(err)
            callback(err, null)
          } else {
            console.log(data)
            callback(null, null)
          }
        })
      },
      function (data, callback) {
        console.log('delete')
        deleteRecord(
          ddb,
          gameSessionTableName,
          {
            roomId: { S: roomId }
          },
          function (err, data) {
            if (err) {
              console.log(err)
              callback(err, null)
            } else {
              console.log(data)
              callback(null, null)
            }
          }
        )
      }
    ],
    function (err, result) {
      console.log(err)
      console.log(result)
      if (!err) {
        console.log('updated ok')
      }
    }
  )
  console.log('finished')
}

function initDynamoDB () {
  // Set the region
  AWS.config.update({ region: defaultRegion })

  // Create an SQS service object
  return new AWS.DynamoDB({ apiVersion: '2012-08-10' })
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

//cleanup("CPY_9cD0yQ0CEEg=")
