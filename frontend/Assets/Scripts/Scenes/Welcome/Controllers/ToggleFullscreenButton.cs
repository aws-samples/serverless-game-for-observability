using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Project.Scene.Welcome {
  public class ToggleFullscreenButton : Button {
    public override void OnPointerDown(PointerEventData eventData) {
      base.OnPointerDown(eventData);
      Screen.fullScreen = !Screen.fullScreen;
    }
  }
}