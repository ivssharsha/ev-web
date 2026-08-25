// Map & Routing Public API Service
// Uses OpenStreetMap Nominatim for Geocoding & OSRM for Real Road Navigation

export interface GeocodeResult {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

export interface RealRouteResult {
  coordinates: [number, number][]; // [lat, lng] array
  distanceKm: number;
  durationMins: number;
  instructions: {
    text: string;
    distance: string;
    modifier?: string;
  }[];
}

// In-memory cache to prevent redundant API calls
const routeCache = new Map<string, RealRouteResult>();
const geocodeCache = new Map<string, GeocodeResult[]>();

/**
 * Public Geocoding API: Search real-world places and addresses
 */
export async function searchPlacesPublic(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim().toLowerCase();
  if (geocodeCache.has(trimmed)) {
    return geocodeCache.get(trimmed)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'EVolt-Smart-EV-Platform/1.0',
      },
    });

    if (!res.ok) throw new Error('Geocoding service unavailable');
    const data = await res.json();

    const results: GeocodeResult[] = data.map((item: any) => {
      const parts = (item.display_name || '').split(',');
      const shortName = parts.slice(0, 2).join(',').trim() || item.name || query;
      return {
        name: item.display_name,
        shortName,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });

    geocodeCache.set(trimmed, results);
    return results;
  } catch (err) {
    console.warn('Public geocoding fallback used:', err);
    return [];
  }
}

/**
 * Public Reverse Geocoding API: Get real address from GPS coordinates
 */
export async function reverseGeocodePublic(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'EVolt-Smart-EV-Platform/1.0',
      },
    });

    if (!res.ok) throw new Error('Reverse geocoding error');
    const data = await res.json();
    const parts = (data.display_name || '').split(',');
    return parts.slice(0, 3).join(',').trim() || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

/**
 * Public OSRM Real Road Driving Route API: Fetches actual road polyline & turn steps
 */
export async function fetchRealRoadRoute(
  fromCoords: { lat: number; lng: number },
  toCoords: { lat: number; lng: number }
): Promise<RealRouteResult> {
  const cacheKey = `${fromCoords.lat.toFixed(4)},${fromCoords.lng.toFixed(4)}_${toCoords.lat.toFixed(4)},${toCoords.lng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // OSRM coordinates are in format: lng,lat;lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM routing request failed');
    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found from OSRM');
    }

    const route = data.routes[0];
    const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
    const durationMins = Math.max(2, Math.round(route.duration / 60));

    // Convert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    // Extract real turn instructions
    const instructions: { text: string; distance: string; modifier?: string }[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      route.legs[0].steps.forEach((step: any) => {
        const stepDistMeters = Math.round(step.distance);
        const distStr = stepDistMeters >= 1000 ? `${(stepDistMeters / 1000).toFixed(1)} km` : `${stepDistMeters}m`;
        const street = step.name || 'main road';
        let text = `Head onto ${street}`;

        if (step.maneuver) {
          const type = step.maneuver.type;
          const modifier = step.maneuver.modifier;

          if (type === 'turn') {
            text = `Turn ${modifier || ''} onto ${street}`.replace(/\s+/g, ' ');
          } else if (type === 'new name') {
            text = `Continue onto ${street}`;
          } else if (type === 'arrive') {
            text = 'Arrive at destination charging station';
          } else if (type === 'depart') {
            text = `Depart from starting point towards ${street}`;
          } else if (type === 'roundabout') {
            text = `Take roundabout towards ${street}`;
          } else if (type === 'fork') {
            text = `Take ${modifier || ''} fork onto ${street}`.replace(/\s+/g, ' ');
          } else if (modifier) {
            text = `Keep ${modifier} onto ${street}`;
          }
        }

        instructions.push({
          text,
          distance: distStr,
          modifier: step.maneuver?.modifier,
        });
      });
    }

    const result: RealRouteResult = {
      coordinates,
      distanceKm,
      durationMins,
      instructions: instructions.length > 0 ? instructions : [
        { text: 'Depart on recommended highway route', distance: `${distanceKm} km` },
        { text: 'Arrive at charging station', distance: '0m' },
      ],
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Using geometric road calculation fallback:', err);
    
    // Resilient fallback using Haversine with road curvature
    const R = 6371;
    const dLat = ((toCoords.lat - fromCoords.lat) * Math.PI) / 180;
    const dLon = ((toCoords.lng - fromCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((fromCoords.lat * Math.PI) / 180) *
        Math.cos((toCoords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.max(1.5, Math.round(R * c * 1.35 * 10) / 10);
    const durationMins = Math.max(4, Math.round((distanceKm / 45) * 60));

    const midLat1 = fromCoords.lat + (toCoords.lat - fromCoords.lat) * 0.33 + 0.003;
    const midLng1 = fromCoords.lng + (toCoords.lng - fromCoords.lng) * 0.33 - 0.002;
    const midLat2 = fromCoords.lat + (toCoords.lat - fromCoords.lat) * 0.66 - 0.002;
    const midLng2 = fromCoords.lng + (toCoords.lng - fromCoords.lng) * 0.66 + 0.003;

    return {
      coordinates: [
        [fromCoords.lat, fromCoords.lng],
        [midLat1, midLng1],
        [midLat2, midLng2],
        [toCoords.lat, toCoords.lng],
      ],
      distanceKm,
      durationMins,
      instructions: [
        { text: 'Depart towards destination on main corridor', distance: '500m' },
        { text: 'Continue along expressway', distance: `${(distanceKm * 0.7).toFixed(1)} km` },
        { text: 'Arrive at charging station', distance: '100m' },
      ],
    };
  }
}
