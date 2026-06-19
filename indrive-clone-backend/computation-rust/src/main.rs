//! InDrive Clone — Pricing & Routing Engine (Rust, Axum + tonic)
//!
//! Runs two listeners:
//!   * gRPC server on :50051  — PricingEngine service consumed by the Hono gateway
//!   * Axum HTTP server on :8082 — `/health`, `/quote?...` for debug/curl
//!
//! The math (Haversine + dynamic surge) lives in `pricing.rs`. The gRPC
//! surface is `grpc_server.rs`.

mod grpc_server;
mod pricing;

use std::net::SocketAddr;

use axum::{
    extract::Query,
    routing::get,
    Router,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing_subscriber::EnvFilter;

#[derive(Debug, Deserialize)]
struct QuoteQuery {
    pickup_lat: f64,
    pickup_lng: f64,
    dropoff_lat: f64,
    dropoff_lng: f64,
    vehicle_type: Option<String>,
    currency: Option<String>,
}

#[derive(Debug, Serialize)]
struct QuoteResponse {
    base_fare: f64,
    distance_fare: f64,
    time_fare: f64,
    surge_multiplier: f64,
    booking_fee: f64,
    suggested_fare: f64,
    minimum_fare: f64,
    currency: String,
    distance_m: f64,
    duration_s: u32,
}

/// Debug HTTP GET /quote?pickup_lat=..&dropoff_lat=..&vehicle_type=sedan
/// Returns the same breakdown the gRPC server would, useful for ad-hoc curl.
async fn quote(Query(q): Query<QuoteQuery>) -> Json<QuoteResponse> {
    let f = pricing::compute_fare(
        q.pickup_lat, q.pickup_lng,
        q.dropoff_lat, q.dropoff_lng,
        q.vehicle_type.as_deref().unwrap_or("sedan"),
        true,
        None, None,
    );
    Json(QuoteResponse {
        base_fare: f.base_fare,
        distance_fare: f.distance_fare,
        time_fare: f.time_fare,
        surge_multiplier: f.surge_multiplier,
        booking_fee: f.booking_fee,
        suggested_fare: f.suggested_fare,
        minimum_fare: f.minimum_fare,
        currency: q.currency.unwrap_or_else(|| "USD".into()),
        distance_m: f.distance_m,
        duration_s: f.duration_s,
    })
}

async fn health() -> &'static str {
    r#"{"status":"ok","service":"computation-rust"}"#
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse()?))
        .init();

    let http_addr: SocketAddr = std::env::var("HTTP_ADDR").unwrap_or_else(|_| "0.0.0.0:8082".into()).parse()?;
    let grpc_addr = std::env::var("GRPC_ADDR").unwrap_or_else(|_| "0.0.0.0:50051".into());

    // Axum debug router
    let app = Router::new()
        .route("/health", get(health))
        .route("/quote", get(quote));

    let http_fut = async move {
        tracing::info!("HTTP debug server listening on {http_addr}");
        let listener = tokio::net::TcpListener::bind(http_addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    };

    let grpc_fut = grpc_server::run(&grpc_addr);

    tokio::try_join!(tokio::spawn(http_fut), tokio::spawn(grpc_fut))?;
    Ok(())
}
