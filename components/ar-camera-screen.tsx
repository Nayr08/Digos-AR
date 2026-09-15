'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Flashlight } from 'lucide-react';
import * as THREE from 'three';

type CameraState = 'requesting' | 'active' | 'denied' | 'unavailable' | 'tracking-error' | 'secure-context-error';
type MindARInstance = {
  start: () => Promise<void>;
  stop: () => void;
  addAnchor: (targetIndex: number) => { group: { add: (object: unknown) => void }; onTargetFound?: () => void; onTargetLost?: () => void };
  renderer: { setAnimationLoop: (callback: (() => void) | null) => void; render: (scene: unknown, camera: unknown) => void; dispose?: () => void };
  scene: unknown;
  camera: unknown;
};

export function ARCameraScreen({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARInstance | null>(null);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [isDawisDetected, setIsDawisDetected] = useState(false);

  const stopTracking = useCallback(() => {
    const mindar = mindarRef.current;
    if (!mindar) return;
    mindar.renderer.setAnimationLoop(null);
    mindar.stop();
    mindar.renderer.dispose?.();
    if (cubeRef.current) {
      cubeRef.current.geometry.dispose();
      const material = cubeRef.current.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
      cubeRef.current = null;
    }
    mindarRef.current = null;
  }, []);

  const startTracking = useCallback(async () => {
    const attempt = ++attemptRef.current;
    stopTracking();
    setIsDawisDetected(false);
    setCameraState('requesting');
    if (!mountedRef.current || !containerRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('secure-context-error');
      return;
    }
    try {
      const { MindARThree } = await import('mind-ar/dist/mindar-image-three.prod.js');
      if (!mountedRef.current || attempt !== attemptRef.current || !containerRef.current) return;
      const mindar = new MindARThree({ container: containerRef.current, imageTargetSrc: '/ar/targets/dawis.mind', uiLoading: 'no', uiScanning: 'no', uiError: 'no' }) as MindARInstance;
      mindarRef.current = mindar;
      const anchor = mindar.addAnchor(0);
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.42),
        new THREE.MeshStandardMaterial({ color: 0x9bff57, roughness: 0.48, metalness: 0.08 }),
      );
      cube.position.set(0, 0, 0.1);
      anchor.group.add(cube);
      anchor.group.add(new THREE.AmbientLight(0xffffff, 1.8));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(1, 2, 2);
      anchor.group.add(keyLight);
      cubeRef.current = cube;
      anchor.onTargetFound = () => { if (mountedRef.current) setIsDawisDetected(true); };
      anchor.onTargetLost = () => { if (mountedRef.current) setIsDawisDetected(false); };
      await mindar.start();
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      const video = containerRef.current.querySelector('video');
      if (video) video.className = 'ar-live-video';
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) canvas.className = 'ar-mindar-canvas';
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      mindar.renderer.setAnimationLoop(() => {
        if (!reducedMotion && cubeRef.current) cubeRef.current.rotation.y += 0.006;
        mindar.renderer.render(mindar.scene, mindar.camera);
      });
      setCameraState('active');
    } catch (error) {
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      stopTracking();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setCameraState('denied');
      else if (name === 'NotFoundError' || name === 'NotReadableError') setCameraState('unavailable');
      else setCameraState('tracking-error');
    }
  }, [stopTracking]);

  useEffect(() => {
    mountedRef.current = true;
    // MindAR owns camera permission and tracking initialization on mount.
    // oxlint-disable-next-line react/react-compiler
    void startTracking();
    return () => { mountedRef.current = false; attemptRef.current += 1; stopTracking(); };
  }, [startTracking, stopTracking]);

  const exitCamera = () => { attemptRef.current += 1; stopTracking(); onBack(); };

  return <div ref={containerRef} className={`screen ar-camera-mode camera-${cameraState} ${isDawisDetected ? 'target-detected' : ''}`}>
    <div className="ar-camera-gradient" aria-hidden="true" />
    {cameraState === 'active' ? <>
      <header className="ar-camera-controls"><button type="button" onClick={exitCamera} aria-label="Exit AR camera"><ArrowLeft size={20} /></button><div><small>AR PREVIEW</small><strong>{isDawisDetected ? 'Target detected' : 'Scanning...'}</strong></div><button type="button" disabled aria-label="Flashlight unavailable in prototype"><Flashlight size={19} /></button></header>
      <section className="ar-scanner-stage" aria-label="DigosAR marker scanner preview"><div className="ar-scanner-frame" aria-hidden="true"><i className="corner top-left" /><i className="corner top-right" /><i className="corner bottom-left" /><i className="corner bottom-right" /><span className="ar-scan-line" /><span className="ar-target-dot dot-one" /><span className="ar-target-dot dot-two" /></div><div className="ar-scanner-copy">{isDawisDetected ? <><strong><Check size={16} /> Dawis Heritage Wharf detected</strong><span>Tracking marker...</span></> : <><strong>Point your camera at a DigosAR marker</strong><span>Keep the marker inside the frame.</span></>}</div></section>
      {isDawisDetected && <output className="ar-detection-indicator"><Check size={14} /> Dawis detected</output>}
    </> : <output className="ar-camera-state">{cameraState === 'requesting' ? <><span className="camera-start-icon"><Camera size={28} /></span><h1>Starting camera...</h1></> : cameraState === 'denied' ? <><Camera size={36} /><h1>Camera access is required to use DigosAR.</h1><p>Allow camera permission in your browser, then try again.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : cameraState === 'secure-context-error' ? <><Camera size={36} /><h1>Camera access requires HTTPS.</h1><p>Open DigosAR using the Vercel HTTPS link to use AR tracking.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : cameraState === 'tracking-error' ? <><Camera size={36} /><h1>Unable to start AR tracking.</h1><p>Check your connection and camera permission, then try again.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : <><Camera size={36} /><h1>Camera is unavailable on this device.</h1><p>Check that your device has a camera and that no other app is using it.</p><button type="button" onClick={exitCamera}>Go back</button></>}</output>}
  </div>;
}
