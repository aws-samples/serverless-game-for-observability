using System.Collections.Generic;
using DT.UniStart;

namespace Project.Scene.Battle {
  public enum GameState {
    IDLE,
    PLAYING,
    OVER,
  }

  public class Model {
    public IEnumState<GameState> state { get; protected set; }
    public IReadOnlyList<IState<int>> scores { get; protected set; }

    // prevent external instantiation
    protected Model() { }
  }

  public record GameStartCommand : ICommand;
  public record GameOverCommand : ICommand;
  public record PlayerHitCommand(int playerId, int count) : ICommand;
  public record LocalShootCommand(LocalShootEvent e) : ICommand;

  public class ModelManager : Model, IStateManager {
    public ModelManager(ICommandRepo cb, IEventInvoker eb) {
      this.state = this.AddEnum(out var state, GameState.IDLE);
      this.scores = this.AddStateArray(out var scores, 2, 0);

      // state management
      cb.Add((GameStartCommand _) => {
        if (this.state.Value != GameState.IDLE) throw new System.Exception("Cannot start game when not idle!");
        state.Value = GameState.PLAYING;
      });
      cb.Add((GameOverCommand _) => {
        if (this.state.Value != GameState.PLAYING) throw new System.Exception("Cannot end game when not playing!");
        state.Value = GameState.OVER;
      });

      // handle shoot
      cb.Add((LocalShootCommand cmd) => {
        eb.Invoke(cmd.e);
      });


      // handle hit
      cb.Add((PlayerHitCommand command) => {
        if (this.state.Value != GameState.PLAYING) throw new System.Exception("Cannot hit player when not playing!");
        if (command.playerId < 0 || command.playerId >= scores.Length) throw new System.Exception("Invalid player id!");
        scores[command.playerId].Value += command.count;
      });
    }
  }
}