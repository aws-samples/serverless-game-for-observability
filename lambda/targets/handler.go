package main

import (
	"context"
	"encoding/json"
	"math"
	"math/rand"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type handler struct {
	delay           time.Duration
	sqsClient       *sqs.Client
	targetsPerBatch int
	queueURL        string
}

func (h *handler) handleRequest(ctx context.Context, event *inputEvent) (*response, error) {
	logger.Info("received event", "event", event)

	newTargets, err := json.Marshal(h.randomTargets())
	if err != nil {
		logger.Info("unable to marshal new targets", "error", err)
		return nil, err
	}

	event.Targets = string(newTargets)
	h.sendMessage(event)

	return &response{
		StatusCode: 200,
		Domain:     event.Domain,
		Stage:      event.Stage,
		Ids:        event.Ids,
		RoomId:     event.RoomId,
	}, nil
}

func (h *handler) randomTargets() []target {
	ret := make([]target, h.targetsPerBatch)

	for i := 0; i < h.targetsPerBatch; i++ {
		ret[i] = target{X: randomFloat(5, 2), Y: randomFloat(3, 2), Id: int(time.Now().UnixMilli()%1000000) + i}
	}

	return ret
}

func (h *handler) sendMessage(data *inputEvent) error {
	body, err := json.Marshal(sqsMessage{
		Action: "newtargets",
		Data:   data,
	})

	if err != nil {
		logger.Error("unable to marshal SQS message", "error", err)
		return err
	}

	logger.Info("sending delayed newtargets message", "message", string(body))

	_, err = h.sqsClient.SendMessage(context.TODO(), &sqs.SendMessageInput{
		MessageBody:  aws.String(string(body)),
		QueueUrl:     aws.String(h.queueURL),
		DelaySeconds: int32(h.delay / time.Second),
	})

	return err
}

func randomFloat(size float64, precision int) float64 {
	p := math.Pow10(precision)
	return float64(int((rand.Float64()*2-1)*size*p)) / p
}
