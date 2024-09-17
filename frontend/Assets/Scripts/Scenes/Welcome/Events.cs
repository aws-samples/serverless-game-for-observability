using DT.UniStart;

namespace Project.Scene.Welcome {
  public record SetInputServerUrlEvent(string serverUrl) : IEvent;
  public record SetInputRoomId(string roomId) : IEvent;

}