using DT.UniStart;

namespace Project.Scene.Battle {
  public class WaitingText : CBC {
    void Start() {
      var eb = this.Get<IEventListener>();

      this.Watch(eb, (GameStartEvent _) => this.gameObject.SetActive(false));
    }
  }
}