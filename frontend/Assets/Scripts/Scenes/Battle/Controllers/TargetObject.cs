using DT.UniStart;
using UnityEngine;

namespace Project.Scene.Battle {
  public class TargetObject : CBC {
    void Start() {
      var config = this.Get<Config>();

      // float
      var position = this.transform.position;
      var randomX = Random.Range(0, Mathf.PI);
      var randomY = Random.Range(0, Mathf.PI);
      this.onUpdate.AddListener(() => {
        this.transform.position = position + new Vector3(Mathf.Sin(Time.time * config.targetFloatSpeed + randomX), Mathf.Sin(Time.time * config.targetFloatSpeed + randomY), 0) * config.targetFloatRange;
      });
    }
  }
}