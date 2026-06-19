//! Pricing & routing engine.
//!
//! - [`haversine_m`] computes great-circle distance in meters between two
//!   lat/lng points.
//! - [`estimate_duration`] converts distance + an assumed average speed
//!   into trip time in seconds (a stand-in for OSRM ETA when no routing
//!   data is available).
//! - [`compute_fare`] turns a (pickup, dropoff, vehicle_type, surge) tuple
//!   into a full FareEstimate. This is the function the gRPC service calls.
//!
//! Why Rust? This is pure CPU-bound geometry + a couple of multiplications.
//! Rust gives us C-like speed with strong memory-safety guarantees, and the
//! tonic gRPC server threads cheaply while keeping the math work allocation-free.

use std::f64::consts::PI;

/// Earth radius in meters (WGS-84 mean radius).
const EARTH_RADIUS_M: f64 = 6_371_000.0;

/// Degrees -> radians.
#[inline]
fn to_rad(deg: f64) -> f64 {
    deg * PI / 180.0
}

/// Returns true if a coordinate pair is finite and within valid WGS-84 ranges.
#[inline]
pub fn coords_valid(lat: f64, lng: f64) -> bool {
    lat.is_finite() && lng.is_finite() && (-90.0..=90.0).contains(&lat) && (-180.0..=180.0).contains(&lng)
}

/// Round a monetary amount to the cent (2 decimal places). Non-finite inputs
/// collapse to 0 so a bad upstream value can never become a NaN charge.
#[inline]
fn round_cents(amount: f64) -> f64 {
    if !amount.is_finite() {
        return 0.0;
    }
    (amount * 100.0).round() / 100.0
}

/// Great-circle distance between two points (Haversine formula).
///
/// Returns distance in meters. Invalid/non-finite coordinates yield 0.0 rather
/// than a NaN that would poison every downstream fare (and break JSON
/// serialization, since serde_json cannot encode NaN).
pub fn haversine_m(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    if !coords_valid(lat1, lng1) || !coords_valid(lat2, lng2) {
        return 0.0;
    }
    let d_lat = to_rad(lat2 - lat1);
    let d_lng = to_rad(lng2 - lng1);
    // Clamp `a` to [0,1]; floating-point error can push it slightly outside,
    // which would make (1.0 - a).sqrt() produce NaN.
    let a = ((d_lat / 2.0).sin().powi(2)
        + to_rad(lat1).cos() * to_rad(lat2).cos() * (d_lng / 2.0).sin().powi(2))
        .clamp(0.0, 1.0);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    EARTH_RADIUS_M * c
}

/// Average urban driving speed assumed for ETA when no live traffic OSRM
/// feed is wired. ~30 km/h accounts for stops/lights in city traffic.
const ASSUMED_SPEED_MPS: f64 = 30_000.0 / 3_600.0;

/// Estimate trip duration from distance + assumed speed. Non-finite or
/// negative distances yield 0 (a NaN/negative cast to u32 is silently 0
/// anyway — here we make that explicit and safe).
pub fn estimate_duration(distance_m: f64) -> u32 {
    if !distance_m.is_finite() || distance_m <= 0.0 {
        return 0;
    }
    let seconds = distance_m / ASSUMED_SPEED_MPS;
    seconds.round().clamp(0.0, u32::MAX as f64) as u32
}

/// Per-vehicle-type fare rules. InDrive's model is rider-propose-a-price, so
/// the "suggested fare" is a hint derived from base + per-km + per-min + booking
/// fee + surge multiplier, clamped above `minimum_fare`.
#[derive(Clone, Copy, Debug)]
pub struct VehicleFareRule {
    pub base: f64,
    pub per_km: f64,
    pub per_min: f64,
    pub booking_fee: f64,
    pub minimum: f64,
}

pub fn rule_for(vehicle_type: &str) -> VehicleFareRule {
    match vehicle_type {
        "motorcycle" => VehicleFareRule { base: 1.50, per_km: 0.75, per_min: 0.10, booking_fee: 0.25, minimum: 3.00 },
        "sedan"      => VehicleFareRule { base: 2.50, per_km: 1.50, per_min: 0.25, booking_fee: 0.50, minimum: 5.00 },
        "suv"        => VehicleFareRule { base: 3.50, per_km: 2.00, per_min: 0.35, booking_fee: 0.75, minimum: 7.00 },
        "luxury"     => VehicleFareRule { base: 6.00, per_km: 3.50, per_min: 0.60, booking_fee: 1.50, minimum: 12.00 },
        _            => VehicleFareRule { base: 2.50, per_km: 1.50, per_min: 0.25, booking_fee: 0.50, minimum: 5.00 }, // fallback = sedan
    }
}

/// Coarse time-of-day surge multiplier. Real InDrive uses live supply/demand;
/// this stand-in bumps fares during 7-10am and 5-8pm peak windows.
pub fn surge_multiplier_for(now_utc_hour: u32) -> f64 {
    match now_utc_hour {
        7..=9 | 17..=19 => 1.5,
        22..=23 | 0..=5 => 0.8,   // quiet hours discount
        _ => 1.0,
    }
}

/// Full fare breakdown for a route.
pub struct ComputedFare {
    pub base_fare: f64,
    pub distance_fare: f64,
    pub time_fare: f64,
    pub surge_multiplier: f64,
    pub booking_fee: f64,
    pub suggested_fare: f64,
    pub minimum_fare: f64,
    pub distance_m: f64,
    pub duration_s: u32,
}

/// Compute the suggested fare InDrive should recommend to a rider.
///
/// `surge_eligible` toggles whether time-of-day surge is applied (rider's
/// proposed fare uses surge as a ceiling, not a floor).
pub fn compute_fare(
    pickup_lat: f64,
    pickup_lng: f64,
    dropoff_lat: f64,
    dropoff_lng: f64,
    vehicle_type: &str,
    surge_eligible: bool,
    explicit_distance_m: Option<f64>,
    explicit_duration_s: Option<u32>,
) -> ComputedFare {
    let rule = rule_for(vehicle_type);

    // distance + duration. Sanitize explicit values: a negative/non-finite
    // actual distance (e.g. a buggy or malicious driver client) must never
    // produce a negative or NaN charge.
    let distance_m = match explicit_distance_m {
        Some(d) if d.is_finite() && d >= 0.0 => d,
        Some(_) => 0.0,
        None => haversine_m(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng),
    };
    let duration_s = explicit_duration_s.unwrap_or_else(|| estimate_duration(distance_m));

    let distance_km = distance_m / 1_000.0;
    let minutes = (duration_s as f64) / 60.0;

    let surge = if surge_eligible {
        // Use UTC hour as a deterministic stand-in for "current time of day".
        surge_multiplier_for(chrono_hour_of_day())
    } else {
        1.0
    };

    // Surge applies to base + distance + time (not the flat booking fee). Each
    // returned component is rounded to the cent so the breakdown reconciles
    // exactly: base + distance + time + fee == suggested (when above minimum).
    let base_fare = round_cents(rule.base * surge);
    let distance_fare = round_cents(distance_km * rule.per_km * surge);
    let time_fare = round_cents(minutes * rule.per_min * surge);
    let booking_fee = round_cents(rule.booking_fee);
    let minimum_fare = round_cents(rule.minimum);

    let subtotal = base_fare + distance_fare + time_fare + booking_fee;
    let suggested_fare = round_cents(subtotal.max(minimum_fare));

    ComputedFare {
        base_fare,
        distance_fare,
        time_fare,
        surge_multiplier: surge,
        booking_fee,
        suggested_fare,
        minimum_fare,
        distance_m,
        duration_s,
    }
}

/// Lightweight UTC hour-of-day without pulling in chrono for this example.
fn chrono_hour_of_day() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    ((secs / 3600) % 24) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn haversine_nyc_sample() {
        // Times Square -> Central Park NYC (~3km)
        let d = haversine_m(40.7580, -73.9855, 40.7829, -73.9654);
        assert!(d > 2_500.0 && d < 4_000.0, "got {d}");
    }

    #[test]
    fn sedan_fare_within_reasonable_range() {
        let f = compute_fare(40.7580, -73.9855, 40.7829, -73.9654, "sedan", false, None, None);
        assert!(f.suggested_fare > 5.0 && f.suggested_fare < 30.0, "got {}", f.suggested_fare);
    }

    #[test]
    fn surge_bumped_during_rush_hour() {
        assert!((surge_multiplier_for(8) - 1.5).abs() < 1e-9);
        assert!((surge_multiplier_for(12) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn never_nan_on_invalid_coords() {
        let f = compute_fare(f64::NAN, 0.0, 200.0, 999.0, "sedan", true, None, None);
        assert!(f.suggested_fare.is_finite(), "fare must never be NaN");
        assert!(f.distance_m.is_finite());
        assert!(f.suggested_fare >= f.minimum_fare);
    }

    #[test]
    fn negative_actual_distance_is_safe() {
        let f = compute_fare(40.0, -73.0, 40.1, -73.1, "sedan", false, Some(-5_000.0), Some(300));
        assert_eq!(f.distance_fare, 0.0);
        assert!(f.suggested_fare >= f.minimum_fare);
        assert!(f.suggested_fare.is_finite());
    }

    #[test]
    fn money_rounded_to_cents() {
        let f = compute_fare(40.7580, -73.9855, 40.9000, -73.5000, "luxury", true, None, None);
        for v in [f.base_fare, f.distance_fare, f.time_fare, f.booking_fee, f.suggested_fare] {
            let cents = (v * 100.0).round();
            assert!((v * 100.0 - cents).abs() < 1e-6, "{v} is not cent-rounded");
        }
    }

    #[test]
    fn breakdown_reconciles_with_total() {
        // A long trip so we're comfortably above the minimum fare.
        let f = compute_fare(40.7580, -73.9855, 41.5000, -73.0000, "sedan", true, None, None);
        let sum = f.base_fare + f.distance_fare + f.time_fare + f.booking_fee;
        assert!((sum - f.suggested_fare).abs() < 1e-9, "sum {sum} != suggested {}", f.suggested_fare);
    }
}
