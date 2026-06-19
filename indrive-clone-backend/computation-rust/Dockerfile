# syntax=docker/dockerfile:1
# Multi-stage Rust build. buf generate is skipped here because build.rs
# compiles the proto at build time; that requires protoc/bin to be present,
# so we install it.
FROM rust:1-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler && rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release --bin pricing-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/pricing-server /usr/local/bin/pricing-server
EXPOSE 8082 50051
CMD ["pricing-server"]
