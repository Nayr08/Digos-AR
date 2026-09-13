'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Flashlight } from 'lucide-react';

type CameraState = 'requesting' | 'active' | 'denied' | 'unavailable';

export function ARCameraScreen({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    const attempt = ++attemptRef.current;
    stopCamera();
    await Promise.resolve();
    if (!mountedRef.current || attempt !== attemptRef.current) return;
    setCameraState('requesting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      if (!mountedRef.current || attempt !== attemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraState('active');
    } catch (error) {
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      const name = error instanceof DOMException ? error.name : '';
      setCameraState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, [stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    // Camera permission is an external browser-system synchronization on mount.
    // oxlint-disable-next-line react/react-compiler
    void startCamera();
    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const exitCamera = () => {
    attemptRef.current += 1;
    stopCamera();
    onBack();
  };

  return <div className={`screen ar-camera-mode camera-${cameraState}`}>
    <video ref={videoRef} className="ar-live-video" autoPlay playsInline muted aria-label="Live rear camera preview" />
    <div className="ar-camera-gradient" aria-hidden="true" />

    {cameraState === 'active' ? <>
      <header className="ar-camera-controls">
        <button type="button" onClick={exitCamera} aria-label="Exit AR camera"><ArrowLeft size={20} /></button>
        <div><small>AR PREVIEW</small><strong>Scanning...</strong></div>
        <button type="button" disabled aria-label="Flashlight unavailable in prototype"><Flashlight size={19} /></button>
      </header>
      <section className="ar-scanner-stage" aria-label="DigosAR marker scanner preview">
        <div className="ar-scanner-frame" aria-hidden="true">
          <i className="corner top-left" /><i className="corner top-right" />
          <i className="corner bottom-left" /><i className="corner bottom-right" />
          <span className="ar-scan-line" />
          <span className="ar-target-dot dot-one" /><span className="ar-target-dot dot-two" />
        </div>
        <div className="ar-scanner-copy"><strong>Point your camera at a DigosAR marker</strong><span>Keep the marker inside the frame.</span></div>
      </section>
    </> : <output className="ar-camera-state">
      {cameraState === 'requesting' ? <><span className="camera-start-icon"><Camera size={28} /></span><h1>Starting camera...</h1></> : cameraState === 'denied' ? <><Camera size={36} /><h1>Camera access is required to use DigosAR.</h1><p>Allow camera permission in your browser, then try again.</p><button type="button" onClick={() => void startCamera()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : <><Camera size={36} /><h1>Camera is unavailable on this device.</h1><p>Check that your device has a camera and that no other app is using it.</p><button type="button" onClick={exitCamera}>Go back</button></>}
    </output>}
  </div>;
}
