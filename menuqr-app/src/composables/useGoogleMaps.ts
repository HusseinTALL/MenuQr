/**
 * Composable for Google Maps integration
 * Handles map initialization, markers, and polyline rendering
 */

/// <reference types="@types/google.maps" />

import { ref, onUnmounted, watch, type Ref } from 'vue';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: typeof google;
  }
}

// Types
interface LatLng {
  lat: number;
  lng: number;
}

interface MarkerOptions {
  position: LatLng;
  title?: string;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  label?: string | google.maps.MarkerLabel;
}

interface MapConfig {
  center?: LatLng;
  zoom?: number;
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
}

// Google Maps API loader
let googleMapsPromise: Promise<typeof google.maps> | null = null;

const loadGoogleMapsAPI = (apiKey: string): Promise<typeof google.maps> => {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    };

    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

// Decode Google Maps polyline
const decodePolyline = (encoded: string): LatLng[] => {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
};

export function useGoogleMaps(
  containerRef: Ref<HTMLElement | null>,
  config: MapConfig = {}
) {
  const map = ref<google.maps.Map | null>(null);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);
  const markers = ref<Map<string, google.maps.Marker>>(new Map());
  const polylines = ref<Map<string, google.maps.Polyline>>(new Map());

  // Get API key from environment
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const initMap = async () => {
    if (!containerRef.value || !apiKey) {
      if (!apiKey) {
        error.value = 'Google Maps API key not configured';
      }
      return;
    }

    try {
      const mapsApi = await loadGoogleMapsAPI(apiKey);

      const defaultConfig: google.maps.MapOptions = {
        center: config.center || { lat: 48.8566, lng: 2.3522 }, // Paris default
        zoom: config.zoom || 14,
        disableDefaultUI: config.disableDefaultUI ?? true,
        zoomControl: config.zoomControl ?? true,
        mapTypeControl: config.mapTypeControl ?? false,
        streetViewControl: config.streetViewControl ?? false,
        fullscreenControl: config.fullscreenControl ?? false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      };

      map.value = new mapsApi.Map(containerRef.value, defaultConfig);
      isLoaded.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load map';
      console.error('Google Maps error:', err);
    }
  };

  // Add or update a marker
  const setMarker = (
    id: string,
    options: MarkerOptions
  ): google.maps.Marker | null => {
    if (!map.value || !isLoaded.value) {return null;}

    // Update existing marker
    if (markers.value.has(id)) {
      const marker = markers.value.get(id)!;
      marker.setPosition(options.position);
      if (options.title) {marker.setTitle(options.title);}
      if (options.icon) {marker.setIcon(options.icon);}
      return marker;
    }

    // Create new marker
    const marker = new google.maps.Marker({
      map: map.value,
      position: options.position,
      title: options.title,
      icon: options.icon,
      label: options.label,
      animation: google.maps.Animation.DROP,
    });

    markers.value.set(id, marker);
    return marker;
  };

  // Remove a marker
  const removeMarker = (id: string) => {
    const marker = markers.value.get(id);
    if (marker) {
      marker.setMap(null);
      markers.value.delete(id);
    }
  };

  // Add or update a polyline from encoded string
  const setPolyline = (
    id: string,
    encodedPath: string,
    options: {
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
    } = {}
  ): google.maps.Polyline | null => {
    if (!map.value || !isLoaded.value) {return null;}

    const path = decodePolyline(encodedPath);

    // Update existing polyline
    if (polylines.value.has(id)) {
      const polyline = polylines.value.get(id)!;
      polyline.setPath(path);
      return polyline;
    }

    // Create new polyline
    const polyline = new google.maps.Polyline({
      map: map.value,
      path,
      strokeColor: options.strokeColor || '#1890ff',
      strokeWeight: options.strokeWeight || 4,
      strokeOpacity: options.strokeOpacity || 0.8,
    });

    polylines.value.set(id, polyline);
    return polyline;
  };

  // Remove a polyline
  const removePolyline = (id: string) => {
    const polyline = polylines.value.get(id);
    if (polyline) {
      polyline.setMap(null);
      polylines.value.delete(id);
    }
  };

  // Clear all markers and polylines
  const clearAll = () => {
    markers.value.forEach((marker) => marker.setMap(null));
    markers.value.clear();
    polylines.value.forEach((polyline) => polyline.setMap(null));
    polylines.value.clear();
  };

  // Fit map bounds to show all markers
  const fitBounds = (padding = 50) => {
    if (!map.value || markers.value.size === 0) {return;}

    const bounds = new google.maps.LatLngBounds();
    markers.value.forEach((marker) => {
      const pos = marker.getPosition();
      if (pos) {bounds.extend(pos);}
    });

    map.value.fitBounds(bounds, padding);
  };

  // Pan to a specific location
  const panTo = (position: LatLng) => {
    if (map.value) {
      map.value.panTo(position);
    }
  };

  // Set zoom level
  const setZoom = (zoom: number) => {
    if (map.value) {
      map.value.setZoom(zoom);
    }
  };

  // Create custom marker icons
  const createDriverIcon = (color = '#1890ff'): google.maps.Symbol => ({
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    rotation: 0,
  });

  const createLocationIcon = (color = '#52c41a'): google.maps.Symbol => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
  });

  // Watch container ref and init when available
  watch(containerRef, (newVal) => {
    if (newVal && !isLoaded.value) {
      initMap();
    }
  }, { immediate: true });

  // Cleanup on unmount
  onUnmounted(() => {
    clearAll();
    map.value = null;
  });

  return {
    map,
    isLoaded,
    error,
    apiKey,
    hasApiKey: !!apiKey,
    setMarker,
    removeMarker,
    setPolyline,
    removePolyline,
    clearAll,
    fitBounds,
    panTo,
    setZoom,
    createDriverIcon,
    createLocationIcon,
    decodePolyline,
  };
}

export default useGoogleMaps;
