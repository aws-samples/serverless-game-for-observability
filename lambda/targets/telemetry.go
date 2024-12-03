package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"go.opentelemetry.io/contrib/detectors/aws/lambda"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
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

	traceExporter, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpoint("localhost:4318"), otlptracehttp.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("unable to create OTLP HTTP trace exporter: %w", err)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sampler),
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithSpanProcessor(&sqsSpanProcessor{queueURL: os.Getenv("DELAYED_QUEUE_URL")}),
	)

	metricExporter, err := otlpmetrichttp.New(ctx, otlpmetrichttp.WithEndpoint("localhost:4318"), otlpmetrichttp.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("unable to create OTLP HTTP metric exporter: %w", err)
	}

	mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)), sdkmetric.WithResource(res))

	return &telemetry{
		tracerProvider: tp,
		meterProvider:  mp,
		shutdown: func(ctx context.Context) {
			tp.Shutdown(ctx)
			mp.Shutdown(ctx)
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

var _ trace.SpanProcessor = (*sqsSpanProcessor)(nil)

type sqsSpanProcessor struct {
	queueURL string
}

func (sp *sqsSpanProcessor) OnStart(_ context.Context, span trace.ReadWriteSpan) {
	if span.InstrumentationLibrary().Name == "github.com/aws/aws-sdk-go-v2/service/sqs" && span.Name() == "SQS.SendMessage" {
		// Set the "messaging.url" attribute as the awsxray exporter looks for this value to set the destination queue attribute
		span.SetAttributes(attribute.String("messaging.url", sp.queueURL))
	}
}
func (sp *sqsSpanProcessor) OnEnd(_ trace.ReadOnlySpan)         {}
func (sp *sqsSpanProcessor) ForceFlush(_ context.Context) error { return nil }
func (sp *sqsSpanProcessor) Shutdown(_ context.Context) error   { return nil }
