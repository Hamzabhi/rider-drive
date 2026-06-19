# syntax=docker/dockerfile:1
# Multi-stage Go build. proto stubs are generated in the builder stage with
# buf before `go build` so we never ship protoc to the runtime image.
FROM golang:1.22-bookworm AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler && rm -rf /var/lib/apt/lists/*
# buf CLI for proto codegen
RUN go install github.com/bufbuild/buf/cmd/buf@v1.34.0

COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Generate gRPC + protobuf stubs from proto/
RUN buf generate || protoc --go_out=. --go-grpc_out=. proto/indrive.proto
RUN go build -o /out/realtime-server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /out/realtime-server /usr/local/bin/realtime-server
EXPOSE 8081 50052
CMD ["realtime-server"]
