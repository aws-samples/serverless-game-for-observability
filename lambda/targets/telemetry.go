package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"go.opentelemetry.io/contrib/detectors/aws/lambda"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type telemetry struct {
	tracerProvider *sdktrace.TracerProvider
	meterProvider  *sdkmetric.MeterProvider
	shutdown       func(context.Context)
}

func initSDK(ctx context.Context, res *resource.Resource) (*telemetry, error) {
	sampler := sdktrace.NeverSample()
	if strings.ToLower(os.Getenv("ENABLE_XRAY")) == "active" {
		sampler = sdktrace.ParentBased(sdktrace.TraceIDRatioBased(.25))
	}

	exporter, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpoint("localhost:4318"), otlptracehttp.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("unable to create OTLP HTTP exporter: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sampler),
		sdktrace.WithBatcher(exporter),
	)

	return &telemetry{
		tracerProvider: tp,
		shutdown: func(ctx context.Context) {
			tp.Shutdown(ctx)
		},
	}, nil
}

func buildResource(ctx context.Context, name string, version string) (*resource.Resource, error) {
	return resource.New(ctx,
		resource.WithSchemaURL(semconv.SchemaURL),
		resource.WithFromEnv(),
		resource.WithTelemetrySDK(),
		resource.WithOS(),
		resource.WithDetectors(lambda.NewResourceDetector()),
		resource.WithAttributes(
			semconv.ServiceName(name),
			semconv.ServiceVersion(version),
		))
}
