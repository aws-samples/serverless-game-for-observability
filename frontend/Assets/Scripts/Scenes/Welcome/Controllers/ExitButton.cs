using DT.UniStart;
using UnityEngine;
using UnityEngine.UI;

namespace Project.Scene.Welcome {
  public class ExitButton : CBC {
    void Start() {
      if (Application.platform == RuntimePlatform.WebGLPlayer)
        this.gameObject.SetActive(false);

      this.GetComponent<Button>().onClick.AddListener(UniStart.ExitGame);
    }
  }
}