using DT.UniStart;
using Project.Scene.Battle;

public class Cloud : CBC {
  void Start() {
    // from left to right, from -15 to 15
    this.transform.SetPositionX(-15);
    this.onFixedUpdate.AddListener(() => {
      if (this.transform.position.x < 15) {
        this.transform.SetPositionX(this.transform.position.x + 0.01f);
      } else {
        this.transform.SetPositionX(-15);
      }
    });

    // in play mode, reset position when game start
    var eb = this.Get<IEventListener>();
    eb.AddListener((GameStartEvent _) => {
      this.transform.SetPositionX(-15);
    });
  }
}
