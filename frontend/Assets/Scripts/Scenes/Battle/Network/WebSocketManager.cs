using DT.UniStart;
using NativeWebSocket;
using UnityEngine;

namespace Project.Scene.Battle {
  public static class WebSocketManager {
    public static void Apply(ComposableBehaviour entry, Config config, IEventBus eb) {
      var websocket = new WebSocket(config.serverUrl);

      // poll messages on every frame
      entry.onUpdate.AddListener(() => {
#if !UNITY_WEBGL || UNITY_EDITOR
        websocket.DispatchMessageQueue();
#endif
      });

      // handle messages, invoke events
      websocket.OnOpen += () => {
        eb.Invoke<WebSocketConnected>();
        Debug.Log("Connection open!");
      };
      websocket.OnError += (e) => {
        eb.Invoke(new WebSocketErrorEvent(e));
      };
      websocket.OnClose += (e) => {
        eb.Invoke(new WebSocketDisconnected(e));
        Debug.Log("Connection closed!");
      };
      websocket.OnMessage += (bytes) => {
        // getting the message as a string
        var message = System.Text.Encoding.UTF8.GetString(bytes);
        eb.Invoke(new WebSocketMessageEvent(message));
        Debug.Log("OnMessage! " + message);
      };

      // send messages
      eb.AddListener((WebSocketSendEvent e) => {
        var message = e.msg;
        if (websocket.State == WebSocketState.Open) {
          Debug.Log("Send: " + message);
          websocket.SendText(message);
        }
      });

      // close websocket on application quit
      entry.onApplicationQuit.AddListener(() => {
        websocket?.Close();
      });

      // waiting for messages
      websocket.Connect();
    }
  }
}