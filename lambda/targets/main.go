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
	"github.com/aws/smithy-go/tracing/smithyoteltracing"
	"go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda"
	"go.opentelemetry.io/contrib/instrumentation/github.com/aws/aws-lambda-go/otellambda/xrayconfig"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func main() {
	res, err := buildResource(context.Background(), "targets", "dev")
	if err != nil {
		logger.Error("unable to create telemetry resource", "error", err)
		return
	}

	providers, err := initSDK(context.TODO(), res)
	if err != nil {
		logger.Error("unable to initialize OTel SDKs", "error", err)
		return
	}

	defer providers.shutdown(context.TODO())

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
		delay: delay,
		sqsClient: sqs.NewFromConfig(sdkConfig, func(o *sqs.Options) {
			if enableXRaySDK := os.Getenv("ENABLE_XRAY_SDK"); enableXRaySDK == "true" {
				o.TracerProvider = smithyoteltracing.Adapt(providers.tracerProvider)
			}
		}),
		targetsPerBatch: int(targetsPerBatch),
		queueURL:        delayedQueueURL,
		traceProvider:   providers.tracerProvider,
	}

	runtime.Start(otellambda.InstrumentHandler(h.handleRequest,
		xrayconfig.WithRecommendedOptions(providers.tracerProvider)...,
	))
}
