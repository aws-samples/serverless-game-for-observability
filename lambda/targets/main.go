package main

import (
	"context"
	"log/slog"
	"os"
	"strconv"
	"time"

	runtime "github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func main() {
	sdkConfig, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		logger.Error("Unable to load default configuration", "error", err)
		return
	}

	targetsPerBatch, err := strconv.ParseInt(os.Getenv("TARGET_PER_BATCH"), 10, 0)
	if err != nil {
		logger.Error("unable to determine number of targets per batch", "error", err)
		targetsPerBatch = 10
	}

	delayedQueueURL := os.Getenv("DELAYED_QUEUE_URL")

	delay, err := time.ParseDuration(os.Getenv("TARGET_DELAYED_SECONDS") + "s")
	if err != nil {
		logger.Error("unable to determine delay duration", "error", err)
		delay = 10 * time.Second
	}

	h := handler{
		delay:           delay,
		sqsClient:       sqs.NewFromConfig(sdkConfig),
		targetsPerBatch: int(targetsPerBatch),
		queueURL:        delayedQueueURL,
	}

	runtime.Start(h.handleRequest)
}
