const defaultRouteEndpoint = 'https://valhalla1.openstreetmap.de/route';
const maxRequestBytes = 8_000;

type RouteLocation = { lat: number; lon: number };

function isRouteLocation(value: unknown): value is RouteLocation {
  if (!value || typeof value !== 'object') return false;
  const location = value as Record<string, unknown>;
  return typeof location.lat === 'number'
    && Number.isFinite(location.lat)
    && location.lat >= -90
    && location.lat <= 90
    && typeof location.lon === 'number'
    && Number.isFinite(location.lon)
    && location.lon >= -180
    && location.lon <= 180;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonResponse({ error: 'Route request is too large.' }, 413);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > maxRequestBytes) {
      return jsonResponse({ error: 'Route request is too large.' }, 413);
    }
    body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Route request must contain valid JSON.' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'Route request is invalid.' }, 400);
  }

  const requestBody = body as Record<string, unknown>;
  if (
    !Array.isArray(requestBody.locations)
    || requestBody.locations.length !== 2
    || !requestBody.locations.every(isRouteLocation)
    || requestBody.costing !== 'pedestrian'
  ) {
    return jsonResponse({ error: 'A valid pedestrian route needs an origin and destination.' }, 400);
  }

  const endpoint = import.meta.env.VITE_VALHALLA_ROUTE_URL || defaultRouteEndpoint;
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        locations: requestBody.locations,
        costing: 'pedestrian',
        units: 'kilometers',
        language: 'en',
      }),
      signal: AbortSignal.timeout(20_000),
    });

    let result: unknown;
    try {
      result = await upstream.json();
    } catch {
      return jsonResponse({
        error: upstream.status >= 500
          ? 'Walking directions are temporarily unavailable. Try again or open Google Maps below.'
          : 'The walking route service returned an invalid response.',
      }, upstream.status >= 500 ? 503 : 502);
    }

    if (upstream.status >= 500) {
      return jsonResponse({
        error: 'Walking directions are temporarily unavailable. Try again or open Google Maps below.',
      }, 503);
    }

    return jsonResponse(result, upstream.status);
  } catch {
    return jsonResponse({ error: 'The walking route service is temporarily unavailable. Try again.' }, 502);
  }
}
