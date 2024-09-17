using DT.UniStart;
using UnityEngine;

namespace Project.Scene.Battle {
  public class DeadMosquito : CBC {
    void Start() {
      var rb = this.GetComponent<Rigidbody2D>();
      var config = this.Get<Config>();

      // give a random rotation
      this.transform.rotation = Quaternion.Euler(0, 0, Random.Range(0, 360));

      // rotate
      rb.AddTorque(config.deadTargetRotateSpeed * Mathf.Sign(Random.Range(-1, 1)));

      // add an up force
      rb.AddForce(Vector2.up * config.deadTargetUpForce, ForceMode2D.Impulse);

      this.onBecameInvisible.AddListener(() => {
        Destroy(this.gameObject);
      });
    }
  }
}