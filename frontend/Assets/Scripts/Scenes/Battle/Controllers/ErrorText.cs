using DT.UniStart;
using TMPro;

namespace Project.Scene.Battle {
  public class ErrorText : CBC {
    void Start() {
      var eb = this.Get<IEventListener>();
      var text = this.GetComponent<TMP_Text>();

      text.text = "";

      this.Watch(eb, (GameErrorEvent e) => text.text = $"Error: {e.msg}");
      this.Watch(eb, (WebSocketErrorEvent e) => text.text = $"Error: {e.msg}");
    }
  }
}