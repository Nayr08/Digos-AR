'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { ArrowUpRight, LocateFixed, LoaderCircle, MapPin } from 'lucide-react';
import { openStreetMapUrl, type MapDestination } from '@/lib/dawis-navigation';

type MapStatus = 'loading' | 'ready' | 'error';
type RouteStatus = 'idle' | 'locating' | 'routing' | 'ready' | 'error';
type MapView = '2d' | '3d';
type Coordinates = { latitude: number; longitude: number };
type WalkingRoute = {
  destinationId: string;
  coordinates: [number, number][];
  distanceKm: number;
  durationSeconds: number;
};

type ValhallaResponse = {
  error?: string;
  trip?: {
    legs?: Array<{ shape?: string; summary?: { length?: number; time?: number } }>;
  };
};

const defaultMapStyle = 'https://tiles.openfreemap.org/styles/liberty';
const buildingSourceId = 'dawis-openfreemap-buildings';
const buildingLayerId = 'dawis-buildings-3d';

function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let latitude = 0;
  let longitude = 0;
  let index = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      if (index >= encoded.length) throw new Error('Incomplete route geometry.');
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) throw new Error('Incomplete route geometry.');
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([longitude / 1e6, latitude / 1e6]);
  }

  return coordinates;
}

function formatRouteDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.max(50, Math.round(distanceKm * 1000 / 10) * 10)} m` : `${distanceKm.toFixed(1)} km`;
}

function locationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'Location access was blocked. Allow it in your browser, then try again.';
  if (error.code === error.TIMEOUT) return 'Finding your location took too long. Try again.';
  return 'Your location is unavailable right now. Try again when you have a clear GPS signal.';
}

function distanceBetweenKm(from: Coordinates, to: MapDestination) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function DawisMapPreview({ destination }: { destination: MapDestination }) {
  const initialDestinationRef = useRef(destination);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<{ origin: Marker | null; destination: Marker | null }>({ origin: null, destination: null });
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading');
  const [mapReady, setMapReady] = useState(false);
  const [mapView, setMapView] = useState<MapView>('3d');
  const [threeDReady, setThreeDReady] = useState(false);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let fatalMapError = false;
    const timeout = window.setTimeout(() => setMapStatus(current => current === 'loading' ? 'error' : current), 12000);

    const initialize = async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !mapContainerRef.current) return;

        map = new maplibre.Map({
          container: mapContainerRef.current,
          style: import.meta.env.VITE_OPENFREEMAP_STYLE_URL || defaultMapStyle,
          center: [initialDestinationRef.current.longitude, initialDestinationRef.current.latitude],
          zoom: 15,
          minZoom: 3,
          maxZoom: 19,
          pitch: 38,
          bearing: -10,
          maxPitch: 60,
          cooperativeGestures: false,
        });
        mapRef.current = map;
        map.addControl(new maplibre.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');
        map.on('error', event => {
          const detail = event as { error?: Error; sourceId?: string };
          const message = detail.error?.message ?? '';
          if (detail.sourceId !== 'walking-route' && /webgl|context lost|style|failed to fetch|network/i.test(message)) {
            fatalMapError = true;
            window.clearTimeout(timeout);
            setMapStatus('error');
          }
        });
        map.getCanvas().addEventListener('webglcontextlost', () => {
          fatalMapError = true;
          window.clearTimeout(timeout);
          setMapStatus('error');
        }, { once: true });
        void map.once('load', () => {
          if (cancelled || fatalMapError) return;
          window.clearTimeout(timeout);

          try {
            map!.addSource(buildingSourceId, {
              type: 'vector',
              url: 'https://tiles.openfreemap.org/planet',
            });
            const firstLabelLayer = map!.getStyle().layers?.find(layer =>
              layer.type === 'symbol' && Boolean(layer.layout?.['text-field']),
            )?.id;
            map!.addLayer({
              id: buildingLayerId,
              type: 'fill-extrusion',
              source: buildingSourceId,
              'source-layer': 'building',
              minzoom: 14,
              filter: ['!=', ['get', 'hide_3d'], true],
              paint: {
                'fill-extrusion-color': '#cbd6c5',
                'fill-extrusion-height': [
                  'interpolate', ['linear'], ['zoom'],
                  14, 0,
                  15, ['coalesce', ['get', 'render_height'], 5],
                ],
                'fill-extrusion-base': [
                  'interpolate', ['linear'], ['zoom'],
                  14, 0,
                  15, ['coalesce', ['get', 'render_min_height'], 0],
                ],
                'fill-extrusion-opacity': 0.82,
              },
            }, firstLabelLayer);
            setThreeDReady(true);
          } catch {
            setThreeDReady(false);
            setMapView('2d');
            map!.setPitch(0);
            map!.setBearing(0);
          }

          setMapReady(true);
          setMapStatus('ready');
        });
      } catch {
        if (!cancelled) setMapStatus('error');
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      markersRef.current.origin?.remove();
      markersRef.current.destination?.remove();
      markersRef.current = { origin: null, destination: null };
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const use3d = mapView === '3d' && threeDReady;
    if (map.getLayer(buildingLayerId)) {
      map.setLayoutProperty(buildingLayerId, 'visibility', use3d ? 'visible' : 'none');
    }
    map.easeTo({
      pitch: use3d ? 38 : 0,
      bearing: use3d ? -10 : 0,
      duration: 380,
    });
  }, [mapReady, mapView, threeDReady]);

  const requestLocation = useCallback(() => {
    setRouteError('');
    setRoute(null);
    if (!window.isSecureContext) {
      setRouteStatus('error');
      setRouteError('Location access requires a secure HTTPS connection.');
      return;
    }
    if (!navigator.geolocation) {
      setRouteStatus('error');
      setRouteError('This browser does not support location access.');
      return;
    }

    setRouteStatus('locating');
    navigator.geolocation.getCurrentPosition(
      position => {
        const currentLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        if (distanceBetweenKm(currentLocation, destination) > 75) {
          setOrigin(null);
          setRoute(null);
          setRouteStatus('error');
          setRouteError('Your location is too far from this Digos destination for a local walking route. Use Google Maps for directions.');
          return;
        }
        setOrigin(currentLocation);
        setRouteStatus('routing');
      },
      error => {
        setOrigin(null);
        setRouteStatus('error');
        setRouteError(locationErrorMessage(error));
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }, [destination]);

  useEffect(() => {
    if (!origin) return;
    const controller = new AbortController();
    let cancelled = false;
    const routeStatusTimer = window.setTimeout(() => {
      if (cancelled) return;
      setRoute(null);
      setRouteError('');
      setRouteStatus('routing');
    }, 0);

    void fetch('/api/walking-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        locations: [
          { lat: origin.latitude, lon: origin.longitude },
          { lat: destination.latitude, lon: destination.longitude },
        ],
        costing: 'pedestrian',
        units: 'kilometers',
        language: 'en',
      }),
    }).then(async response => {
      const result = await response.json() as ValhallaResponse;
      if (!response.ok || result.error || !result.trip?.legs?.[0]?.shape) {
        throw new Error(result.error || 'No walking route is available for this destination.');
      }
      const leg = result.trip.legs[0];
      const coordinates = decodePolyline6(leg.shape!);
      if (coordinates.length < 2) throw new Error('No walking route is available for this destination.');
      return {
        destinationId: destination.id,
        coordinates,
        distanceKm: leg.summary?.length ?? 0,
        durationSeconds: leg.summary?.time ?? 0,
      } satisfies WalkingRoute;
    }).then(result => {
      if (cancelled) return;
      setRoute(result);
      setRouteStatus('ready');
    }).catch(error => {
      if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
      setRoute(null);
      setRouteStatus('error');
      setRouteError(error instanceof Error && error.message ? error.message : 'Could not calculate a walking route. Try Google Maps below.');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(routeStatusTimer);
      controller.abort();
    };
  }, [origin, destination.id, destination.latitude, destination.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentRoute = route?.destinationId === destination.id ? route : null;
    const markerElement = (className: string, label: string) => {
      const element = document.createElement('div');
      element.className = className;
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', label);
      return element;
    };

    markersRef.current.origin?.remove();
    markersRef.current.destination?.remove();
    markersRef.current.origin = null;
    markersRef.current.destination = null;
    const destinationElement = markerElement('dawis-map-marker dawis-map-marker-destination', destination.name);
    let cancelled = false;

    const drawMarkersAndRoute = async () => {
      const maplibre = await import('maplibre-gl');
      if (cancelled || mapRef.current !== map || !map.isStyleLoaded()) return;
      markersRef.current.destination = new maplibre.Marker({
        element: destinationElement,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([destination.longitude, destination.latitude]).addTo(map);
      if (origin) {
        const originElement = markerElement('dawis-map-marker dawis-map-marker-origin', 'Your current location');
        markersRef.current.origin = new maplibre.Marker({
          element: originElement,
          anchor: 'center',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        })
          .setLngLat([origin.longitude, origin.latitude]).addTo(map);
      }

      const feature = currentRoute ? {
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'LineString' as const, coordinates: currentRoute.coordinates },
      } : { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } };
      const source = map.getSource('walking-route') as import('maplibre-gl').GeoJSONSource | undefined;
      if (source) source.setData(feature);
      else map.addSource('walking-route', { type: 'geojson', data: feature });

      if (!map.getLayer('walking-route-outline')) {
        const firstLabelLayer = map.getStyle().layers?.find(layer =>
          layer.type === 'symbol' && Boolean(layer.layout?.['text-field']),
        )?.id;
        map.addLayer({ id: 'walking-route-outline', type: 'line', source: 'walking-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffdf7', 'line-width': 9, 'line-opacity': 0.95 } }, firstLabelLayer);
        map.addLayer({ id: 'walking-route-line', type: 'line', source: 'walking-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#9BFF57', 'line-width': 5, 'line-opacity': 0.98 } }, firstLabelLayer);
      }

      if (currentRoute && origin) {
        const bounds = new maplibre.LngLatBounds(
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        );
        for (const [longitude, latitude] of currentRoute.coordinates) bounds.extend([longitude, latitude]);
        map.fitBounds(bounds, { padding: { top: 54, right: 62, bottom: 54, left: 42 }, maxZoom: 16, duration: 550 });
      } else if (origin) {
        map.fitBounds(new maplibre.LngLatBounds(
          [origin.longitude, origin.latitude], [destination.longitude, destination.latitude],
        ), { padding: 55, maxZoom: 15, duration: 550 });
      } else {
        map.flyTo({ center: [destination.longitude, destination.latitude], zoom: 15, duration: 450 });
      }
    };

    void drawMarkersAndRoute();
    return () => { cancelled = true; };
  }, [destination, mapReady, origin, route]);

  const routeIsCurrent = route?.destinationId === destination.id;
  const locationButtonText = routeStatus === 'locating' ? 'Finding your location…' : origin ? 'Refresh my location' : 'Show route from my location';

  return <section className="dawis-map-preview" aria-label={`Map preview for ${destination.name}`}>
    <div className="dawis-map-frame" data-map-tour="map">
      <div ref={mapContainerRef} className="dawis-map-canvas dawis-live-map" role="application" aria-label={`Interactive map showing ${destination.name}`} />
      {mapStatus !== 'error' && <>
        <button
          type="button"
          data-map-tour="route-location"
          className="dawis-map-location-button"
          onClick={requestLocation}
          disabled={routeStatus === 'locating' || routeStatus === 'routing'}
          aria-label={origin ? 'Refresh location and walking route' : 'Show walking route from your location'}
        >
          {routeStatus === 'locating' || routeStatus === 'routing' ? <LoaderCircle size={15} className="is-spinning" /> : <LocateFixed size={15} />}
          {locationButtonText}
        </button>
        <fieldset className="dawis-map-view-toggle" data-map-tour="map-view-toggle">
          <legend>Map view</legend>
          <button type="button" aria-pressed={mapView === '2d'} disabled={!mapReady} onClick={() => setMapView('2d')}>2D</button>
          <button type="button" aria-pressed={mapView === '3d'} disabled={!mapReady || !threeDReady} onClick={() => setMapView('3d')}>3D</button>
        </fieldset>
      </>}
      {mapStatus === 'loading' && <output className="dawis-map-status"><i aria-hidden="true" />Loading interactive map…</output>}
      {mapStatus === 'error' && <output className="dawis-map-status is-error">
        <span>Interactive map is unavailable right now.</span>
        <a href={openStreetMapUrl(destination)} target="_blank" rel="noopener noreferrer">Open map <ArrowUpRight size={14} /></a>
      </output>}
    </div>
    {mapStatus === 'ready' && mapView === '3d' && threeDReady && <p className="dawis-map-3d-note">3D building shapes are schematic. OpenStreetMap heights may be estimated and are not verified landmark models.</p>}
    <output className={`dawis-route-summary ${routeStatus === 'error' ? 'is-error' : ''}`} aria-live="polite">
      {routeIsCurrent && routeStatus === 'ready' ? <>
        <span className="dawis-route-summary-icon"><MapPin size={17} /></span>
        <span><strong>{formatRouteDistance(route!.distanceKm)} walking route</strong><small>About {Math.max(1, Math.round(route!.durationSeconds / 60))} min · to {destination.name}</small></span>
      </> : routeStatus === 'locating' ? <><LoaderCircle size={16} className="is-spinning" /><span>Getting your current location…</span></>
        : routeStatus === 'routing' ? <><LoaderCircle size={16} className="is-spinning" /><span>Finding a walking route to {destination.name}…</span></>
          : routeStatus === 'error' ? <><span className="dawis-route-summary-icon"><MapPin size={17} /></span><span>{routeError || 'Could not calculate a walking route. Try Google Maps below.'}</span></>
            : routeStatus === 'ready' ? <><LoaderCircle size={16} className="is-spinning" /><span>Updating route to {destination.name}…</span></>
              : <><span className="dawis-route-summary-icon"><MapPin size={17} /></span><span>Enable location to draw a walking route to {destination.name}.</span></>}
    </output>
    <p className="dawis-map-caption">Map style <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>. When you request a route, your location is sent to the routing service.</p>
  </section>;
}
