using System;
using DT.UniStart;
using UnityEngine;

namespace Project.Scene.Battle {
  public static class MessageDispatcher {
    public static void Apply(Config config, ICommandBus cb, IEventBus eb) {
      // create or join server when the websocket is connected
      eb.AddListener((WebSocketConnected _) => {
        if (config.localPlayerId == 0) {
          // create room
          eb.Invoke(new WebSocketSendEvent(JsonUtility.ToJson(new CreateRoomAction {
            action = "create",
            room = config.roomId,
          })));
        } else {
          // join room
          eb.Invoke(new WebSocketSendEvent(JsonUtility.ToJson(new JoinRoomAction {
            action = "join",
            room = config.roomId,
          })));
        }
      });

      // process game events
      eb.AddListener((LocalShootEvent e) => {
        var (x, y, angle, playerId) = e;
        eb.Invoke(new WebSocketSendEvent(JsonUtility.ToJson(new ShootAction {
          action = "shoot",
          origin = new Origin {
            x = x,
            y = y,
          },
          angle = angle,
        })));
      });

      // listen for messages from the server and invoke game events
      eb.AddListener((WebSocketMessageEvent e) => {
        var str = e.str;
        var raw = TryDeserialize<ServerMessage>(str);
        if (raw.type == "error") {
          var msg = TryDeserialize<ErrorEvent>(raw.msg);
          eb.Invoke(new GameErrorEvent(msg.type));
          Debug.LogError(msg.type);
        } else if (raw.type == "game start") {
          var msg = TryDeserialize<GameStartEvent>(raw.msg);
          eb.Invoke(msg);
        } else if (raw.type == "player shoot") {
          var msg = TryDeserialize<PlayerShootEvent>(raw.msg);
          eb.Invoke(new GameShootEvent(msg));
        } else if (raw.type == "new target") {
          var msg = TryDeserialize<NewTargetEvent>(raw.msg);
          eb.Invoke(msg);
        } else if (raw.type == "game over") {
          var msg = TryDeserialize<GameOverEvent>(raw.msg);
          eb.Invoke(msg);
        } else {
          Debug.LogError("Unknown message type: " + raw.type);
          eb.Invoke(new GameErrorEvent("Unknown message type: " + raw.type));
        }
      });
    }

    static T TryDeserialize<T>(string str) {
      try {
        return JsonUtility.FromJson<T>(str);
      } catch (Exception e) {
        Debug.LogError("Failed to deserialize string: " + str + " to type " + typeof(T).Name + ", returning default value.");
        Debug.LogError(e);
        return default;
      }
    }
  }
}