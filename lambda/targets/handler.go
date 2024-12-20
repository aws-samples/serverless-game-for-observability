package main

import (
	"context"
	"encoding/json"
	"math"
	"math/rand"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"go.opentelemetry.io/contrib/propagators/aws/xray"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

type handler struct {
	delay           time.Duration
	sqsClient       *sqs.Client
	targetsPerBatch int
	queueURL        string
	traceProvider   trace.TracerProvider
	propagator      xray.Propagator
}

func (h *handler) handleRequest(ctx context.Context, event *inputEvent) (*response, error) {
	logger.InfoContext(ctx, "received event", "event", event)

	_, span := h.traceProvider.Tracer("github.com/aws-samples/serverless-game-for-observability/lambda/targets").Start(ctx,
		"Random Targets",
		trace.WithAttributes(attribute.Int("target.count", h.targetsPerBatch)),
	)

	logger.InfoContext(ctx, "span details", "sampled", span.SpanContext().IsSampled())

	newTargets, err := json.Marshal(h.randomTargets())
	if err != nil {
		logger.InfoContext(ctx, "unable to marshal new targets", "error", err)
		return nil, err
	}

	span.End()

	event.Targets = string(newTargets)
	h.sendMessage(ctx, event)

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

func (h *handler) sendMessage(ctx context.Context, data *inputEvent) error {
	ctx, span := h.traceProvider.Tracer("github.com/aws-samples/serverless-game-for-observability/lambda/targets").Start(ctx,
		"Sending Message",
		trace.WithAttributes(attribute.String("queue.url", h.queueURL), attribute.Int("delay", int(h.delay))),
	)
	defer span.End()

	logger.InfoContext(ctx, "span details", "sampled", span.SpanContext().IsSampled())

	body, err := json.Marshal(sqsMessage{
		Action: "newtargets",
		Data:   data,
	})

	if err != nil {
		logger.ErrorContext(ctx, "unable to marshal SQS message", "error", err)
		return err
	}

	logger.InfoContext(ctx, "sending delayed newtargets message", "message", string(body))

	traceContext := map[string]string{}
	h.propagator.Inject(ctx, propagation.MapCarrier(traceContext))

	_, err = h.sqsClient.SendMessage(ctx, &sqs.SendMessageInput{
		MessageBody:  aws.String(string(body)),
		QueueUrl:     aws.String(h.queueURL),
		DelaySeconds: int32(h.delay / time.Second),
		MessageSystemAttributes: map[string]types.MessageSystemAttributeValue{
			"AWSTraceHeader": {
				DataType:    aws.String("String"),
				StringValue: aws.String(traceContext["X-Amzn-Trace-Id"]),
			},
		},
	})

	return err
}

func randomFloat(size float64, precision int) float64 {
	p := math.Pow10(precision)
	return float64(int((rand.Float64()*2-1)*size*p)) / p
}
