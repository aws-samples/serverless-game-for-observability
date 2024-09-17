using DT.UniStart;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Project.Scene.Battle {
  public class BackButton : CBC {
    void Start() {
      this.GetComponent<Button>().onClick.AddListener(() => {
        SceneManager.LoadScene("Welcome");
      });
    }
  }
}