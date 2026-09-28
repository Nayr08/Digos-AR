'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, LocateFixed, MapPin } from 'lucide-react';
import { mapUrl, destinationDirection, type MapDestination } from '@/lib/dawis-navigation';

export function DawisNavigation({ destination }: { destination: MapDestination }) {
  const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState('Enable location to see your distance to the destination.');
  const [tracking, setTracking] = useState(false);
  const [camera, setCamera] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [cameraMessage, setCameraMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchRef = useRef<number | null>(null);
  const generation = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    generation.current++;
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (!camera) return;
    const orientation = (event: DeviceOrientationEvent) => {
      const ios = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      const value = typeof ios.webkitCompassHeading === 'number' && (ios.webkitCompassAccuracy ?? 0) >= 0
        ? ios.webkitCompassHeading : event.absolute && event.alpha !== null ? 360 - event.alpha : null;
      if (value !== null && Number.isFinite(value)) setHeading((value + (window.screen.orientation?.angle ?? 0) + 360) % 360);
    };
    window.addEventListener('deviceorientation', orientation);
    window.addEventListener('deviceorientationabsolute', orientation);
    return () => {
      window.removeEventListener('deviceorientation', orientation);
      window.removeEventListener('deviceorientationabsolute', orientation);
    };
  }, [camera]);

  const locate = () => {
    if (!navigator.geolocation) { setLocationMessage('Location is unavailable on this device. Use walking directions below.'); return; }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    setTracking(true);
    setLocationMessage('Finding your location…');
    watchRef.current = navigator.geolocation.watchPosition(result => {
      setPosition(result.coords);
      setLocationMessage(`GPS accuracy: approximately ${Math.round(result.coords.accuracy)} m`);
    }, error => {
      setPosition(null);
      setTracking(false);
      setLocationMessage(error.code === 1 ? 'Location permission denied. Enable it in your browser or use Google Maps.' : 'Unable to get a GPS fix. Move outdoors and try again.');
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  };

  const stopCamera = () => {
    generation.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCamera(false);
    setHeading(null);
    setCameraMessage('');
  };
  const startCamera = async () => {
    const token = ++generation.current;
    setCameraMessage('Opening camera…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera requires HTTPS and a supported browser.');
      const orientationApi = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      if (orientationApi?.requestPermission && await orientationApi.requestPermission() !== 'granted') {
        throw new Error('Allow motion access to use the camera compass.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (token !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if (token !== generation.current) return;
      setCamera(true);
      setCameraMessage('Hold your phone upright. The arrow points toward the destination, not along a walking route.');
      if (watchRef.current === null) locate();
    } catch (error) {
      if (token !== generation.current) return;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraMessage(error instanceof Error ? error.message : 'Camera unavailable. Use the map below.');
    }
  };
  const direction = position ? destinationDirection(position.latitude, position.longitude, destination) : null;
  const reliable = position && position.accuracy <= 50;
  const angle = direction && heading !== null ? ((direction.bearing - heading + 540) % 360) - 180 : null;

  return <div className="dawis-navigation">
    <div className={`dawis-camera ${camera ? 'is-active' : ''}`}>
      <video ref={videoRef} muted playsInline aria-label="Live camera compass" />
      {camera && <div className="dawis-camera-overlay">
        {angle !== null && reliable && direction && direction.distance > Math.max(position?.accuracy ?? 0, 20)
          ? <ArrowUp size={76} style={{ transform: `rotate(${angle}deg)` }} aria-label={`Direction toward ${destination.name}`} />
          : <strong>{!position ? 'Waiting for location…' : !reliable ? 'GPS accuracy is low—use the map.' : direction && direction.distance <= Math.max(position.accuracy, 20) ? `Near the ${destination.name} destination pin` : 'Waiting for compass—keep the phone upright.'}</strong>}
        <small>Direction only · follow mapped paths</small>
      </div>}
    </div>
    <div className="dawis-map-frame">
      <iframe src={mapUrl(destination)} title={`${destination.name} destination map`} className={camera ? 'dawis-live-map is-mini' : 'dawis-live-map'} loading="lazy" />
      <a className="dawis-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
    </div>
    <section className="dawis-location-details" aria-label="Your distance from the destination">
      <p className="dawis-distance"><MapPin size={18} />{direction ? `${direction.distance >= 1000 ? (direction.distance / 1000).toFixed(1) + ' km' : Math.round(direction.distance) + ' m'} straight-line distance` : destination.name}</p>
      <small>{position ? `GPS accuracy: approximately ${Math.round(position.accuracy)} m` : locationMessage}</small>
    </section>
    <div className="dawis-map-controls">
      <button type="button" onClick={locate} disabled={tracking && !!position}><LocateFixed size={17} />{position ? 'Location enabled' : tracking ? 'Finding location…' : 'Enable location'}</button>
      <button type="button" onClick={camera ? stopCamera : () => void startCamera()} disabled={cameraMessage === 'Opening camera…'}><Camera size={17} />{camera ? 'Disable compass' : 'Enable compass'}</button>
    </div>
    {cameraMessage && <output>{cameraMessage}</output>}
  </div>;
}
