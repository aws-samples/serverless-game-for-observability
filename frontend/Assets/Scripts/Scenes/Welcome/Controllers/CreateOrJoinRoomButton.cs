using DT.UniStart;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Project.Scene.Welcome {
  public class CreateOrJoinRoomButton : CBC {
    [Tooltip("0 means the room creator, 1 means the room joiner")]
    [SerializeField] int playerId;

    void Start() {
      var config = this.Get<Config>();

      this.GetComponent<Button>().onClick.AddListener(() => {
        config.localPlayerId = this.playerId;
        SceneManager.LoadScene("Battle");
      });
    }
  }
}