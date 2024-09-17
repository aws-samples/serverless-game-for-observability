using DT.UniStart;
using TMPro;

namespace Project.Scene.Welcome {
  public class RoomIdInput : CBC {
    void Start() {
      var config = this.Get<Config>();
      var el = this.Get<IEventListener>();
      var input = this.GetComponent<TMP_InputField>();

      // set initial value
      input.text = config.roomId;

      // register listener
      input.onEndEdit.AddListener((roomId) => config.roomId = roomId);

      // listen event bus
      el.AddListener((SetInputRoomId e) => {
        input.text = e.roomId;
        config.roomId = e.roomId;
      });
    }
  }
}