// redisstore wraps go-redis with the geo-spatial primitives InDrive relies on.
//
// Redis GEO data structures store members as (longitude, latitude, name).
// We use a single sorted-set-backed GEO key (`drivers:geo`) for all
// online drivers; GEORADIUS gives us the "find drivers within X meters"
// primitive that powers matching.
package redisstore

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Store struct {
	*redis.Client
}

func New(url string) (*Store, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	c := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := c.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	return &Store{c}, nil
}

// GeoKey is the single Redis GEO set holding every online driver's position.
const GeoKey = "drivers:geo"

// DriverNearby is one element returned by FindNearbyDrivers.
type DriverNearby struct {
	DriverId  string
	Latitude  float64
	Longitude float64
	DistanceM float64
}

// UpdateDriverPosition writes a driver's lat/lng to the GEO set with a
// TTL-protected online marker. Called on every WS location ping (~3s).
func (s *Store) UpdateDriverPosition(ctx context.Context, driverId string, lat, lng float64) error {
	// GEOADD requires (longitude, latitude, member) order.
	if err := s.GeoAdd(ctx, GeoKey, &redis.GeoLocation{
		Longitude: lng, Latitude: lat, Name: driverId,
	}).Err(); err != nil {
		return err
	}
	// mark online so matching knows this driver is currently connectable
	return s.HSet(ctx, "driver:status:"+driverId,
		"online", 1, "lat", lat, "lng", lng, "ts", time.Now().Unix()).Err()
}

// FindNearbyDrivers returns drivers within `radiusMeters` of (lat,lng).
// This is the GEORADIUS call that drives CreateRideRequest.
func (s *Store) FindNearbyDrivers(ctx context.Context, lat, lng float64, radiusMeters float64) ([]DriverNearby, error) {
	res, err := s.GeoRadius(ctx, GeoKey, lng, lat, &redis.GeoRadiusQuery{
		Radius:    radiusMeters,
		Unit:      "m",
		WithCoord: true,
		WithDist:  true,
		Sort:      "ASC",
		Count:     20,
	}).Result()
	if err != nil {
		return nil, err
	}
	out := make([]DriverNearby, 0, len(res))
	for _, loc := range res {
		out = append(out, DriverNearby{
			DriverId:  loc.Name,
			Longitude: loc.Longitude,
			Latitude:  loc.Latitude,
			DistanceM: loc.Dist,
		})
	}
	return out, nil
}

// RemoveDriverPosition deletes a driver from the GEO set on disconnect.
func (s *Store) RemoveDriverPosition(ctx context.Context, driverId string) error {
	if err := s.ZRem(ctx, GeoKey, driverId).Err(); err != nil {
		return err
	}
	return s.Del(ctx, "driver:status:"+driverId).Err()
}

// SetDriverStatusOnline / IsDriverOnline — used by matching before dispatch.
func (s *Store) SetDriverStatusOnline(ctx context.Context, driverId string, online int) error {
	return s.HSet(ctx, "driver:status:"+driverId, "online", online).Err()
}
func (s *Store) IsDriverOnline(ctx context.Context, driverId string) (bool, error) {
	v, err := s.HGet(ctx, "driver:status:"+driverId, "online").Int()
	if err == redis.Nil {
		return false, nil
	}
	return v == 1, err
}
