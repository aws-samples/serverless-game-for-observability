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

### 2. Update Game Status

"Lambda Logic需要从DynamoDB中获取对局信息，并把每次操作的结果写入DynamoDB"

### 3. Generate New Mosquitto

"Lambda Logic 也向SQS with Delay再写入一个生成蚊子的消息，即可实现周期性生成蚊子"
