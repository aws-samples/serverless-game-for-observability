using DT.UniStart;
using NativeWebSocket;

namespace Project.Scene.Battle {
  public record GameErrorEvent(string msg) : IEvent;
  public record WebSocketErrorEvent(string msg) : IEvent;
  public record WebSocketSendEvent(string msg) : IEvent;
  public record WebSocketConnected : IEvent;
  public record LocalShootEvent(float x, float y, float angle, int playerId) : IEvent;
  public record WebSocketMessageEvent(string str) : IEvent;
  public record GameShootEvent(PlayerShootEvent e) : IEvent;
  public record WebSocketDisconnected(WebSocketCloseCode code) : IEvent;
}