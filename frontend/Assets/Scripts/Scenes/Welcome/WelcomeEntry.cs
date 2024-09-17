using System.Web;
using DT.UniStart;
using UnityEngine;

namespace Project.Scene.Welcome {
  public class WelcomeEntry : Entry {
    [SerializeField] Config config;

    void Awake() {
      var eb = new DebugEventBus();

      this.Add(this.config);
      this.Add<IEventListener>(eb);

      // read server url from query string
      if (Application.platform == RuntimePlatform.WebGLPlayer) {
        // use next update to wait for listener to be registered
        this.onNextUpdate(() => {
          // get url params
          var ss = Application.absoluteURL.Split('?'); // strings
          if (ss.Length < 2) return;
          var queryString = ss[1];
          if (queryString == null) return;
          var urlParams = HttpUtility.ParseQueryString(queryString);

          // auto load server url
          var serverUrl = urlParams.Get("serverUrl");
          if (serverUrl != null) eb.Invoke(new SetInputServerUrlEvent(serverUrl));

          // auto load room id
          var room = urlParams.Get("room");
          if (room != null) eb.Invoke(new SetInputRoomId(room));
        });
      }
    }
  }
}