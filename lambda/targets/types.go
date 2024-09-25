package main

type response struct {
	StatusCode int    `json:"statusCode"`
	Domain     string `json:"domain"`
	Stage      string `json:"stage"`
	Ids        string `json:"ids"`
	RoomId     string `json:"roomId"`
}

type inputEvent struct {
	Targets string `json:"targets"`
	Domain  string `json:"domain"`
	Stage   string `json:"stage"`
	Ids     string `json:"ids"`
	RoomId  string `json:"roomId"`
}

type target struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	Id int     `json:"id"`
}

type sqsMessage struct {
	Action string      `json:"action"`
	Data   *inputEvent `json:"data"`
}
