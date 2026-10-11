export type MapDestination = { id: string; name: string; latitude: number; longitude: number };
export const MAP_DESTINATIONS: MapDestination[] = [
  { id: 'dawis', name: 'Dawis Heritage Wharf', latitude: 6.7298256, longitude: 125.3758917 },
  { id: 'eco-park', name: 'Eco Park', latitude: 6.775982405173788, longitude: 125.34299176956782 },
  { id: 'rizal-park', name: 'Rizal Park', latitude: 6.744489398426599, longitude: 125.35555837252804 },
  { id: 'mediatrix-cathedral', name: 'Mediatrix Cathedral', latitude: 6.753920849728519, longitude: 125.35624917465849 },
];
export function walkingUrl(destination: MapDestination) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${destination.latitude},${destination.longitude}`)}&travelmode=walking`;
}
export function mapUrl(destination: MapDestination) {
  const { latitude: lat, longitude: lon } = destination;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lon - .006},${lat - .006},${lon + .006},${lat + .006}`)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}
export function openStreetMapUrl(destination: MapDestination) {
  const { latitude, longitude } = destination;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}
