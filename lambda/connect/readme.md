# Function Definition

## Requirements

### 1. Define Object Overlapping

"Lambda Logic会判断炮弹是否会击中蚊子，并通过WebSocket把结果返回客户端"

``` json
{
    "event": {
        "type": "check-overlapping",
        "others": {
            // ...
        }
    }
}
```

```shell
# wss://70uogn0zz6.execute-api.ap-southeast-1.amazonaws.com/demo
# yagrxu

wss://70uogn0zz6.execute-api.ap-southeast-1.amazonaws.com/demo
awscurl --service execute-api -X POST -d "{'type':'game start', 'msg':'{\"targets\":[{\"x\":100, \"y\":200, \"id\":\"100-200\"}]}'}" https://70uogn0zz6.execute-api.ap-southeast-1.amazonaws.com/demo/@connections/CD1SfeW0SQ0CHtg=
```

### 2. Update Game Status

"Lambda Logic需要从DynamoDB中获取对局信息，并把每次操作的结果写入DynamoDB"

### 3. Generate New Mosquitto

"Lambda Logic 也向SQS with Delay再写入一个生成蚊子的消息，即可实现周期性生成蚊子"
