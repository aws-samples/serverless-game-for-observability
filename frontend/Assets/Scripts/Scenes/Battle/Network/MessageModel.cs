
using DT.UniStart;

namespace Project.Scene.Battle {
  [System.Serializable]
  public struct ServerMessage {
    public string type;
    public string msg;
  }
  [System.Serializable]
  public struct ErrorEvent {
    public string type;
  }
  [System.Serializable]
  public struct Origin {
    public float x;
    public float y;
  }
  [System.Serializable]
  public struct Target {
    public float x;
    public float y;
    public int id;
  }
  [System.Serializable]
  public struct GameStartEvent : IEvent {
    public Target[] targets;
  }
  [System.Serializable]
  public struct PlayerShootEvent : IEvent {
    public int[] hit;
    public int player;
    public Origin origin;
    public float angle;
  }
  [System.Serializable]
  public struct NewTargetEvent : IEvent {
    public Target[] targets;
  }
  [System.Serializable]
  public struct GameOverEvent : IEvent {
    public int winner;
  }
  [System.Serializable]
  public struct CreateRoomAction {
    public string action;
    public string room;
  }
  [System.Serializable]
  public struct JoinRoomAction {
    public string action;
    public string room;
  }
  [System.Serializable]
  public struct ShootAction {
    public string action;
    public Origin origin;
    public float angle;
  }
}