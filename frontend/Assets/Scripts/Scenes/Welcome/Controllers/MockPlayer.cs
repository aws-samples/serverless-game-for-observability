using DT.UniStart;

using UnityEngine;

namespace Project.Scene.Welcome {
  public class MockPlayer : CBC {
    public bool clockwise = false;

    void Start() {
      var cannon = this.transform.Find("Cannon");
      var config = this.Get<Config>();

      // start rotation within angle range
      this.onUpdate.AddListener(() => {
        if (this.clockwise) {
          cannon.Rotate(0, 0, -config.cannonRotationSpeed * Time.deltaTime);
        } else {
          cannon.Rotate(0, 0, config.cannonRotationSpeed * Time.deltaTime);
        }
        var angle = cannon.localEulerAngles.z;
        if (!this.clockwise && angle < 180 && angle > config.angleRange / 2) {
          this.clockwise = true;
        } else if (this.clockwise && angle > 180 && angle < -config.angleRange / 2 + 360) {
          this.clockwise = false;
        }
      });
    }
  }
}