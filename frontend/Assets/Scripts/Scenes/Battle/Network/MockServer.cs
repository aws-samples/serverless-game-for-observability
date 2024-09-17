using System.Collections.Generic;
using DT.UniStart;
using UnityEngine;

namespace Project.Scene.Battle {
  public static class MockServer {
    public static void Apply(ComposableBehaviour entry, Config config, IEventBus eb) {
      Debug.Log("Using mock server");

      var targets = new Dictionary<int, Target>();
      var targetId = 0; // auto increment
      var playerScores = new int[2];

      // init targets
      for (var i = 0; i < config.mockServerInitTargetCount; ++i) {
        targets[i] = new Target {
          x = Random.Range(-5f, 5f),
          y = Random.Range(-3f, 3f),
          id = targetId,
        };
        ++targetId;
      }

      // start game
      entry.Invoke(() => {
        eb.Invoke(new GameStartEvent {
          targets = targets.Values.Map(v => v) // to array
        });
      }, config.mockServerLatency);

      // handle shoot events
      eb.AddListener((LocalShootEvent e) => {
        var (x, y, angle, playerId) = e;
        // simulate latency
        entry.Invoke(() => {
          // calculate hit
          var hit = new List<int>();
          foreach (var target in targets.Values) {
            var targetPos = new Vector2(target.x, target.y);
            var origin = new Vector2(x, y);
            // calculate the distance between the target and the laser with origin and angle
            var distance = Vector2.Distance(targetPos, origin) * Mathf.Abs(Mathf.Sin((Vector2.Angle(targetPos - origin, new Vector2(Mathf.Cos(angle * Mathf.Deg2Rad), Mathf.Sin(angle * Mathf.Deg2Rad)))) * Mathf.Deg2Rad));
            if (distance < (config.laserWidth + config.targetPrefab.transform.localScale.x) / 2) {
              hit.Add(target.id);
            }
          }

          // remove hit targets
          foreach (var id in hit) {
            targets.Remove(id);
          }

          playerScores[playerId] += hit.Count;

          eb.Invoke(new GameShootEvent(new PlayerShootEvent {
            player = playerId,
            hit = hit.ToArray(),
            origin = new Origin {
              x = x,
              y = y,
            },
            angle = angle,
          }));
        }, config.mockServerLatency);
      });

      // generate new target
      var generate = true;
      entry.InvokeRepeating(() => {
        if (!generate) return;
        var newTargets = new Target[config.mockServerNewTargetCount];
        for (var i = 0; i < config.mockServerNewTargetCount; ++i) {
          targets[targetId] = new Target {
            x = Random.Range(-5f, 5f),
            y = Random.Range(-3f, 3f),
            id = targetId,
          };
          newTargets[i] = targets[targetId];
          ++targetId;
        }
        eb.Invoke(new NewTargetEvent {
          targets = newTargets
        });
      }, config.mockServerLatency + config.mockServerNewTargetInterval, config.mockServerNewTargetInterval);

      // mock game over event
      entry.Invoke(() => {
        eb.Invoke(new GameOverEvent {
          winner = playerScores[0] > playerScores[1] ? 0 : 1,
        });
        generate = false;
      }, config.mockServerLatency + config.gameTimeout);
    }
  }
}