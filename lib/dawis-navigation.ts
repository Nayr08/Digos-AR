export type MapDestination = { id: string; name: string; latitude: number; longitude: number };
export const MAP_DESTINATIONS: MapDestination[] = [
  { id: 'dawis', name: 'Dawis Heritage Wharf', latitude: 6.7298256, longitude: 125.3758917 },
  { id: 'rizal-park', name: 'Rizal Park', latitude: 6.744489398426599, longitude: 125.35555837252804 },
  { id: 'mediatrix-cathedral', name: 'Mediatrix Cathedral', latitude: 6.753920849728519, longitude: 125.35624917465849 },
  { id: 'eco-park', name: 'Eco Park', latitude: 6.775982405173788, longitude: 125.34299176956782 },
];
export function walkingUrl(destination: MapDestination) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${destination.latitude},${destination.longitude}`)}&travelmode=walking`;
}
export function mapUrl(destination: MapDestination) {
  const { latitude: lat, longitude: lon } = destination;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lon - .006},${lat - .006},${lon + .006},${lat + .006}`)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}
export function destinationDirection(latitude: number, longitude: number, destination: MapDestination) {
  const rad = Math.PI / 180;
  const lat1 = latitude * rad;
  const lat2 = destination.latitude * rad;
  const deltaLat = lat2 - lat1;
  const deltaLon = (destination.longitude - longitude) * rad;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return {
    distance: 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))),
    bearing: (Math.atan2(Math.sin(deltaLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)) / rad + 360) % 360,
  };
}
