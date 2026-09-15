'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Flashlight } from 'lucide-react';
import * as THREE from 'three';

type BoardSpec = { title: string; body: string; accent: string; width: number; height: number };
const boardSpecs: BoardSpec[] = [
  { title: 'Dawis Heritage Wharf', body: 'Heritage Site • Digos City', accent: '#d9a441', width: 1.65, height: 0.88 },
  { title: 'History', body: 'A beloved waterfront landmark where generations of Digosnon stories meet the sea.', accent: '#6fa37a', width: 1.25, height: 0.72 },
  { title: 'About', body: 'A scenic wharf and promenade known for quiet views, local life, and heritage memories.', accent: '#c89055', width: 1.25, height: 0.72 },
  { title: 'Fun Fact', body: 'Dawis faces the Digos Gulf and remains a favorite stop for sunset walks.', accent: '#9bff57', width: 1.25, height: 0.72 },
];

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath(); context.roundRect(x, y, width, height, radius); context.fill();
}

function createBoard(spec: BoardSpec) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 420;
  const context = canvas.getContext('2d'); if (!context) return new THREE.Group();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(0,0,0,.28)'; roundedRect(context, 22, 28, 724, 370, 34);
  context.fillStyle = '#5b3e2c'; roundedRect(context, 10, 10, 724, 370, 30);
  context.fillStyle = '#f3e4c2'; roundedRect(context, 28, 28, 688, 334, 22);
  context.fillStyle = spec.accent; roundedRect(context, 28, 28, 688, 58, 22);
  context.fillRect(28, 58, 688, 28);
  context.fillStyle = '#143324'; context.font = '700 34px Arial'; context.fillText(spec.title, 58, 145);
  context.fillStyle = '#395246'; context.font = '400 23px Arial';
  const words = spec.body.split(' '); let line = ''; let y = 195;
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (context.measureText(next).width > 590) { context.fillText(line, 58, y); line = word; y += 34; } else line = next; }
  if (line) context.fillText(line, 58, y);
  context.fillStyle = '#8c6a42'; context.font = '600 17px Arial'; context.fillText('DIGOSAR · DISCOVER BEYOND THE MAP', 58, 335);
  const texture = new THREE.CanvasTexture(canvas); texture.encoding = THREE.sRGBEncoding;
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  group.add(mesh); group.userData.texture = texture;
  return group;
}

function disposeBoard(object: THREE.Object3D) {
  object.traverse((child) => { const mesh = child as THREE.Mesh; mesh.geometry?.dispose(); const material = mesh.material; if (Array.isArray(material)) material.forEach((item) => { item.map?.dispose(); item.dispose(); }); else if (material) { material.map?.dispose(); material.dispose(); } });
}

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
  const boardsRef = useRef<THREE.Group[]>([]);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [isDawisDetected, setIsDawisDetected] = useState(false);

  const stopTracking = useCallback(() => {
    const mindar = mindarRef.current;
    if (!mindar) return;
    mindar.renderer.setAnimationLoop(null);
    mindar.stop();
    mindar.renderer.dispose?.();
    boardsRef.current.forEach(disposeBoard); boardsRef.current = [];
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
      const boards = boardSpecs.map((spec, index) => { const board = createBoard(spec); const positions = [[0, 0.64, 0.08], [-0.9, 0.02, 0.02], [0.9, 0.02, 0.02], [0.18, 1.2, -0.1]][index]; board.position.set(positions[0], positions[1], positions[2]); board.userData.baseY = positions[1]; board.userData.phase = index * 0.8; anchor.group.add(board); return board; });
      boardsRef.current = boards;
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
        boardsRef.current.forEach((board) => { if (!reducedMotion) { board.position.y = board.userData.baseY + Math.sin(performance.now() * 0.0015 + board.userData.phase) * 0.012; board.rotation.z = Math.sin(performance.now() * 0.001 + board.userData.phase) * 0.008; } });
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
