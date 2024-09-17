using UnityEngine;

[CreateAssetMenu(menuName = "ScriptableObjects/Config")]
public class Config : ScriptableObject {
  [Header("Server")]
  public string serverUrl;
  public bool usingMockServer => this.serverUrl == "";
  public float mockServerLatency = 0.2f;
  public int mockServerInitTargetCount = 5;
  public float mockServerNewTargetInterval = 3f;
  public int mockServerNewTargetCount = 3;
  public float mockPlayerShootInterval = 0.5f;

  [Header("Game")]
  public string roomId;
  public int localPlayerId;
  public int gameTimeout = 60;
  public float scoreShakeScale = 1.1f;
  public float scoreShakeSpeed = 0.2f;

  [Header("Cannon")]
  public float angleRange = 160f;
  public float cannonRotationSpeed = 180f;

  [Header("Laser")]
  public float laserWidth = 0.6f;
  public float laserFadeSpeed = 5f;
  public Material laserMaterial;
  public float laserPowerGrowSpeed = 2;
  public float laserPowerMoveSpeed = 4;
  public float laserPowerMoveRange = 0.03f;

  [Header("Target")]
  public float targetFloatSpeed = 4;
  public float targetFloatRange = 0.03f;

  [Header("Dead Target")]
  public float deadTargetRotateSpeed = 180f;
  public float deadTargetUpForce = 2f;

  [Header("Prefabs")]
  public GameObject targetPrefab;
  public GameObject deadTargetPrefab;
}