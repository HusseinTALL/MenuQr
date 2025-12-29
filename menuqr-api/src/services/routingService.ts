/**
 * Routing Service - Google Maps API Integration
 * Provides distance calculation, ETA, and route optimization
 */

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  durationInTraffic?: number; // Duration with traffic in seconds
  polyline?: string; // Encoded polyline for map display
}

export interface ETAResult {
  eta: Date;
  durationMinutes: number;
  distanceKm: number;
  trafficCondition: 'light' | 'moderate' | 'heavy' | 'unknown';
}

export interface GeocodingResult {
  formattedAddress: string;
  coordinates: Coordinates;
  placeId?: string;
}

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number; text: string };
  duration_in_traffic?: { value: number; text: string };
  distance?: { value: number; text: string };
}

interface DirectionsStep {
  html_instructions: string;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  start_location: { lat: number; lng: number };
  end_location: { lat: number; lng: number };
  polyline: { points: string };
}

interface DirectionsLeg {
  distance: { value: number; text: string };
  duration: { value: number; text: string };
  duration_in_traffic?: { value: number; text: string };
  start_address: string;
  end_address: string;
  steps: DirectionsStep[];
}

interface DirectionsRoute {
  overview_polyline: { points: string };
  legs: DirectionsLeg[];
  waypoint_order?: number[];
}

// API Response types
interface DistanceMatrixResponse {
  status: string;
  rows: Array<{
    elements: DistanceMatrixElement[];
  }>;
}

interface DirectionsResponse {
  status: string;
  routes: DirectionsRoute[];
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
    };
    place_id: string;
  }>;
}

// ============================================
// Service Class
// ============================================

class RoutingService {
  private apiKey: string;
  private enabled: boolean;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = config.googleMaps.apiKey;
    this.enabled = config.googleMaps.enabled;

    if (!this.enabled) {
      logger.warn('Google Maps API is not configured. Using fallback calculations.');
    }
  }

  /**
   * Check if Google Maps API is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Calculate distance and duration between two points
   * Uses Distance Matrix API for accurate results with traffic
   */
  async getDistanceAndDuration(
    origin: Coordinates,
    destination: Coordinates,
    departureTime?: Date
  ): Promise<RouteInfo> {
    if (!this.enabled) {
      return this.calculateHaversineDistance(origin, destination);
    }

    try {
      const params = new URLSearchParams({
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: this.apiKey,
        mode: 'driving',
        units: 'metric',
        departure_time: departureTime
          ? Math.floor(departureTime.getTime() / 1000).toString()
          : 'now',
        traffic_model: 'best_guess',
      });

      const response = await fetch(
        `${this.baseUrl}/distancematrix/json?${params}`
      );
      const data = await response.json() as DistanceMatrixResponse;

      if (data.status !== 'OK') {
        logger.error('Distance Matrix API error:', data.status);
        return this.calculateHaversineDistance(origin, destination);
      }

      const element: DistanceMatrixElement = data.rows[0]?.elements[0];
      if (element?.status !== 'OK') {
        logger.error('Distance Matrix element error:', element?.status);
        return this.calculateHaversineDistance(origin, destination);
      }

      return {
        distanceMeters: element.distance?.value || 0,
        distanceKm: (element.distance?.value || 0) / 1000,
        durationSeconds: element.duration?.value || 0,
        durationMinutes: Math.ceil((element.duration?.value || 0) / 60),
        durationInTraffic: element.duration_in_traffic?.value,
      };
    } catch (error) {
      logger.error('Error calling Distance Matrix API:', error);
      return this.calculateHaversineDistance(origin, destination);
    }
  }

  /**
   * Get full route with polyline for map display
   * Uses Directions API
   */
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[]
  ): Promise<RouteInfo & { steps?: DirectionsStep[] }> {
    if (!this.enabled) {
      return this.calculateHaversineDistance(origin, destination);
    }

    try {
      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: this.apiKey,
        mode: 'driving',
        units: 'metric',
        departure_time: 'now',
        traffic_model: 'best_guess',
      });

      if (waypoints && waypoints.length > 0) {
        const waypointStr = waypoints
          .map((wp) => `${wp.lat},${wp.lng}`)
          .join('|');
        params.append('waypoints', `optimize:true|${waypointStr}`);
      }

      const response = await fetch(
        `${this.baseUrl}/directions/json?${params}`
      );
      const data = await response.json() as DirectionsResponse;

      if (data.status !== 'OK') {
        logger.error('Directions API error:', data.status);
        return this.calculateHaversineDistance(origin, destination);
      }

      const route: DirectionsRoute = data.routes[0];
      const leg: DirectionsLeg = route.legs[0];

      return {
        distanceMeters: leg.distance.value,
        distanceKm: leg.distance.value / 1000,
        durationSeconds: leg.duration.value,
        durationMinutes: Math.ceil(leg.duration.value / 60),
        durationInTraffic: leg.duration_in_traffic?.value,
        polyline: route.overview_polyline.points,
        steps: leg.steps,
      };
    } catch (error) {
      logger.error('Error calling Directions API:', error);
      return this.calculateHaversineDistance(origin, destination);
    }
  }

  /**
   * Calculate ETA for delivery
   * Takes into account current traffic conditions
   */
  async calculateETA(
    driverLocation: Coordinates,
    destination: Coordinates,
    additionalMinutes: number = 0
  ): Promise<ETAResult> {
    const routeInfo = await this.getDistanceAndDuration(
      driverLocation,
      destination
    );

    // Use traffic duration if available, otherwise regular duration
    const durationSeconds =
      routeInfo.durationInTraffic || routeInfo.durationSeconds;
    const durationMinutes = Math.ceil(durationSeconds / 60) + additionalMinutes;

    // Determine traffic condition
    let trafficCondition: ETAResult['trafficCondition'] = 'unknown';
    if (routeInfo.durationInTraffic && routeInfo.durationSeconds > 0) {
      const trafficRatio = routeInfo.durationInTraffic / routeInfo.durationSeconds;
      if (trafficRatio < 1.1) {
        trafficCondition = 'light';
      } else if (trafficRatio < 1.3) {
        trafficCondition = 'moderate';
      } else {
        trafficCondition = 'heavy';
      }
    }

    const eta = new Date(Date.now() + durationMinutes * 60 * 1000);

    return {
      eta,
      durationMinutes,
      distanceKm: routeInfo.distanceKm,
      trafficCondition,
    };
  }

  /**
   * Calculate ETA for full delivery journey
   * Driver → Restaurant → Customer
   */
  async calculateDeliveryETA(
    driverLocation: Coordinates,
    restaurantLocation: Coordinates,
    customerLocation: Coordinates,
    prepTimeMinutes: number = 0
  ): Promise<{
    toRestaurant: ETAResult;
    toCustomer: ETAResult;
    totalETA: Date;
    totalMinutes: number;
  }> {
    // Calculate driver to restaurant
    const toRestaurant = await this.calculateETA(
      driverLocation,
      restaurantLocation
    );

    // Calculate restaurant to customer (add prep time)
    const toCustomer = await this.calculateETA(
      restaurantLocation,
      customerLocation,
      prepTimeMinutes
    );

    // Total time: driver to restaurant + prep time + restaurant to customer
    const totalMinutes =
      toRestaurant.durationMinutes + prepTimeMinutes + toCustomer.durationMinutes;
    const totalETA = new Date(Date.now() + totalMinutes * 60 * 1000);

    return {
      toRestaurant,
      toCustomer,
      totalETA,
      totalMinutes,
    };
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.enabled) {
      logger.warn('Geocoding not available without Google Maps API');
      return null;
    }

    try {
      const params = new URLSearchParams({
        address,
        key: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/json?${params}`
      );
      const data = await response.json() as GeocodingResponse;

      if (data.status !== 'OK' || !data.results?.[0]) {
        logger.warn('Geocoding failed for address:', address);
        return null;
      }

      const result = data.results[0];
      return {
        formattedAddress: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        placeId: result.place_id,
      };
    } catch (error) {
      logger.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
    if (!this.enabled) {
      logger.warn('Reverse geocoding not available without Google Maps API');
      return null;
    }

    try {
      const params = new URLSearchParams({
        latlng: `${coordinates.lat},${coordinates.lng}`,
        key: this.apiKey,
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/json?${params}`
      );
      const data = await response.json() as GeocodingResponse;

      if (data.status !== 'OK' || !data.results?.[0]) {
        return null;
      }

      const result = data.results[0];
      return {
        formattedAddress: result.formatted_address,
        coordinates,
        placeId: result.place_id,
      };
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Optimize route for multiple deliveries
   * Returns optimal order of waypoints
   */
  async optimizeRoute(
    origin: Coordinates,
    destinations: Coordinates[]
  ): Promise<{
    optimizedOrder: number[];
    totalDistanceKm: number;
    totalDurationMinutes: number;
    polyline?: string;
  }> {
    if (!this.enabled || destinations.length === 0) {
      return {
        optimizedOrder: destinations.map((_, i) => i),
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
      };
    }

    if (destinations.length === 1) {
      const route = await this.getRoute(origin, destinations[0]);
      return {
        optimizedOrder: [0],
        totalDistanceKm: route.distanceKm,
        totalDurationMinutes: route.durationMinutes,
        polyline: route.polyline,
      };
    }

    try {
      // Use Directions API with waypoint optimization
      const params = new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destinations[destinations.length - 1].lat},${destinations[destinations.length - 1].lng}`,
        key: this.apiKey,
        mode: 'driving',
        units: 'metric',
        optimize: 'true',
      });

      // Add intermediate waypoints
      if (destinations.length > 1) {
        const waypointStr = destinations
          .slice(0, -1)
          .map((d) => `${d.lat},${d.lng}`)
          .join('|');
        params.append('waypoints', `optimize:true|${waypointStr}`);
      }

      const response = await fetch(
        `${this.baseUrl}/directions/json?${params}`
      );
      const data = await response.json() as DirectionsResponse;

      if (data.status !== 'OK') {
        return {
          optimizedOrder: destinations.map((_, i) => i),
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
        };
      }

      const route: DirectionsRoute = data.routes[0];
      const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
      const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

      return {
        optimizedOrder: route.waypoint_order || destinations.map((_, i) => i),
        totalDistanceKm: totalDistance / 1000,
        totalDurationMinutes: Math.ceil(totalDuration / 60),
        polyline: route.overview_polyline.points,
      };
    } catch (error) {
      logger.error('Error optimizing route:', error);
      return {
        optimizedOrder: destinations.map((_, i) => i),
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
      };
    }
  }

  /**
   * Fallback: Calculate distance using Haversine formula
   * Used when Google Maps API is not available
   */
  private calculateHaversineDistance(
    origin: Coordinates,
    destination: Coordinates
  ): RouteInfo {
    const R = 6371; // Earth's radius in km

    const dLat = this.toRad(destination.lat - origin.lat);
    const dLng = this.toRad(destination.lng - origin.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(origin.lat)) *
        Math.cos(this.toRad(destination.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Estimate duration: average speed 30 km/h in city
    // Add 20% buffer for traffic and stops
    const averageSpeedKmH = 25;
    const durationMinutes = Math.ceil((distanceKm / averageSpeedKmH) * 60 * 1.2);

    return {
      distanceMeters: Math.round(distanceKm * 1000),
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSeconds: durationMinutes * 60,
      durationMinutes,
    };
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Export singleton instance
export const routingService = new RoutingService();
export default routingService;
