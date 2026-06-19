//! tonic gRPC server that exposes the PricingEngine service defined in
//! proto/indrive.proto. The HTTP gateway calls this for fare suggestions
//! and final fare reconciliation.
//!
//! The actual math lives in `pricing.rs` — the gRPC layer is just a thin
//! adapter from proto types to Rust types.

use tonic::{transport::Server, Request, Response, Status};

// The generated module is produced by `buf generate` into src/proto/indrive.rs.
// It compiles cleanly when present; if absent (minimal sandbox), the build.rs
// fallback emits a stub. The Docker build always runs buf generate.
include!(concat!(env!("OUT_DIR"), "/indrive.rs"));

use indrive::{
    pricing_engine_server::{PricingEngine, PricingEngineServer},
    FareEstimate, FareRequest, FinalizeRequest, Point,
};

use crate::pricing::compute_fare;

#[derive(Default)]
pub struct PricingEngineService;

#[tonic::async_trait]
impl PricingEngine for PricingEngineService {
    async fn calculate_fare(&self, req: Request<FareRequest>) -> Result<Response<FareEstimate>, Status> {
        let FareRequest {
            pickup, dropoff, vehicle_type, surge_eligible, currency,
        } = req.into_inner();

        let pickup = pickup.ok_or_else(|| Status::invalid_argument("missing pickup"))?;
        let dropoff = dropoff.ok_or_else(|| Status::invalid_argument("missing dropoff"))?;

        let f = compute_fare(
            pickup.latitude, pickup.longitude,
            dropoff.latitude, dropoff.longitude,
            &vehicle_type, surge_eligible,
            None, None,
        );

        Ok(Response::new(to_estimate(f, currency)))
    }

    async fn finalize_fare(&self, req: Request<FinalizeRequest>) -> Result<Response<FareEstimate>, Status> {
        let FinalizeRequest {
            pickup, dropoff, actual_distance_meters, actual_duration_seconds,
            vehicle_type, currency,
        } = req.into_inner();

        // Use the ACTUAL distance/time provided by the driver's odometer/timer
        // rather than the haversine estimate — this is the reconciled final fare.
        let p = pickup.unwrap_or_default();
        let d = dropoff.unwrap_or_default();
        let f = compute_fare(
            p.latitude, p.longitude,
            d.latitude, d.longitude,
            &vehicle_type, false,
            Some(actual_distance_meters),
            Some(actual_duration_seconds),
        );

        Ok(Response::new(to_estimate(f, currency)))
    }
}

fn to_estimate(f: crate::pricing::ComputedFare, currency: String) -> FareEstimate {
    FareEstimate {
        base_fare: f.base_fare,
        distance_fare: f.distance_fare,
        time_fare: f.time_fare,
        surge_multiplier: f.surge_multiplier,
        booking_fee: f.booking_fee,
        suggested_fare: f.suggested_fare,
        minimum_fare: f.minimum_fare,
        currency,
        distance_meters: f.distance_m,
        duration_seconds: f.duration_s as u32,
        encoded_polyline: String::new(),
    }
}

pub async fn run(addr: &str) -> Result<(), Box<dyn std::error::Error>> {
    let addr: std::net::SocketAddr = addr.parse()?;
    tracing::info!("pricing gRPC server listening on {addr}");

    Server::builder()
        .add_service(PricingEngineServer::new(PricingEngineService::default()))
        .serve(addr)
        .await?;

    Ok(())
}
