package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel/trace"
)

var _ slog.Handler = &traceAwareLogHandler{}

var logger = slog.New(&traceAwareLogHandler{next: slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{AddSource: true})})

type traceAwareLogHandler struct {
	next slog.Handler
}

func (h *traceAwareLogHandler) Enabled(ctx context.Context, lvl slog.Level) bool {
	return h.next.Enabled(ctx, lvl)
}

func (h *traceAwareLogHandler) Handle(ctx context.Context, rec slog.Record) error {
	if spanctx := trace.SpanContextFromContext(ctx); spanctx.IsValid() {
		rec = rec.Clone()
		rec.AddAttrs(
			slog.String("traceID", fmt.Sprintf("1-%s-%s", spanctx.TraceID().String(), spanctx.SpanID().String())),
		)
	}

	return h.next.Handle(ctx, rec)
}

func (h *traceAwareLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &traceAwareLogHandler{next: h.next.WithAttrs(attrs)}
}

func (h *traceAwareLogHandler) WithGroup(name string) slog.Handler {
	return &traceAwareLogHandler{next: h.next.WithGroup(name)}
}
