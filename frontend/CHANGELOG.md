# CHANGELOG

## v0.1.18

- Feat: remove `Exit` button on WebGL build.

## v0.1.17

- Fix: cannons now will rotate in different directions to keep this game fair.
- Note: move to unity editor 2022.3.
- Note: apply UniStart framework v11.3.0.

## v0.1.16

- Feat: load room id from query string.
- Fix: fullscreen button on PC needed to click twice.
- Feat: fullscreen also works on mobile (tested on Android Chrome).

## v0.1.15

Fix `Fullscreen` button not working.

## v0.1.14

- Feat: add `Fullscreen` button, only works in PC, and needed to click twice.

## v0.1.13

More debug output for target creation and destruction.

## v0.1.12

- Fix: server url from query string not working.
- Fix: back button style.

## v0.1.11

Fix: allow empty query string.

## v0.1.10

Apply AIGC art assets.

## v0.1.9

- Feat: responsive canvas size.
  - Remove footer.
- Fix: allow empty server url.

## v0.1.8

- Feat: click to shoot.
- Feat: read server url from url query string.
- Fix: cloud will have consistent behaviour among all clients.

## v0.1.7

- Feat: add responsive Model.
- Feat: add blinking help in battle scene.
- Feat: set non-local player to gray.
- Feat: better welcome scene.
- Feat: add cloud.

## v0.1.6

Apply `UniStart` and `UniUtils`. Optimize code.

## v0.1.5

- Feat: show error message.
- Fix: canvas scale with screen size.

## v0.1.4

Use TryDeserialize to catch errors.

## v0.1.3

- Set `C++ compiler configuration` to `Release` instead of `Debug`.
- Fix: Player can't shoot.

## v0.1.2

- Fix: WebSocket client send empty object since JsonUtility can't serialize anonymous class.
- Fix: Server event should be deserialized twice.
- Fix: Make structures serializable.
- Fix: Set `C++ compiler configuration` to `Debug` instead of `Release` to avoid `Not implemented: Class::FromIl2CppType`. Deep dive this issue later.

## v0.1.1

- Add server url hint.
- Support copy/paste in WebGL.
- Allow run in background.

## v0.1.0

The initial release.
