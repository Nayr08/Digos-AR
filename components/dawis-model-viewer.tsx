'use client';

import { useEffect, useRef, useState } from 'react';
import { Rotate3d } from 'lucide-react';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DAWIS_MODEL_SRC = '/ar/models/dawis-heritage-wharf-mobile.glb?v=explore-preview-1';

type PointerPoint = { x: number; y: number };

export function DawisModelViewer() {
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const baseDistanceRef = useRef(4);
  const autoRotateRef = useRef(true);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const previousPinchDistanceRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let disposed = false;
    let frame = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);
    renderer.domElement.className = 'dawis-model-canvas';
    rendererRef.current = renderer;
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight(0xd9f7ff, 0x173323, 2.1));
    const key = new THREE.DirectionalLight(0xfff0d2, 3.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8ad8ff, 1.3);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    const pivot = new THREE.Group();
    pivot.rotation.order = 'YXZ';
    pivot.rotation.x = -0.15;
    pivot.rotation.y = -0.55;
    scene.add(pivot);
    pivotRef.current = pivot;

    const resize = () => {
      const width = Math.max(stage.clientWidth, 1);
      const height = Math.max(stage.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    const draco = new DRACOLoader();
    draco.setDecoderPath('/ar/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(DAWIS_MODEL_SRC, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if ('roughness' in material) material.roughness = Math.max(Number(material.roughness) || 0.6, 0.62);
          if ('metalness' in material) material.metalness = Math.min(Number(material.metalness) || 0, 0.18);
        });
      });

      const sourceBox = new THREE.Box3().setFromObject(model);
      const sourceSize = sourceBox.getSize(new THREE.Vector3());
      const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.01);
      // Give the model a stronger presence in the mobile preview while keeping
      // a comfortable margin for the terminal platform and support piles.
      model.scale.setScalar(3.5 / maxDimension);
      model.position.set(-sourceCenter.x * model.scale.x, -sourceCenter.y * model.scale.y, -sourceCenter.z * model.scale.z);
      pivot.add(model);

      const fittedBox = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBox.getSize(new THREE.Vector3());
      const fittedMax = Math.max(fittedSize.x, fittedSize.y, fittedSize.z, 0.01);
      const viewDistance = (fittedMax / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.08;
      baseDistanceRef.current = viewDistance;
      camera.position.copy(new THREE.Vector3(1.25, 0.78, 1.45).normalize().multiplyScalar(viewDistance));
      camera.lookAt(0, 0, 0);
      setIsLoading(false);
    }, undefined, () => {
      if (!disposed) {
        setIsLoading(false);
        setLoadError(true);
      }
    });

    const animate = () => {
      if (disposed) return;
      if (autoRotateRef.current && pivotRef.current) pivotRef.current.rotation.y += 0.0028;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

    const setCameraZoom = (factor: number) => {
      const activeCamera = cameraRef.current;
      if (!activeCamera) return;
      const currentDistance = activeCamera.position.length() || baseDistanceRef.current;
      const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, baseDistanceRef.current * 0.58, baseDistanceRef.current * 1.45);
      activeCamera.position.normalize().multiplyScalar(nextDistance);
      activeCamera.lookAt(0, 0, 0);
    };

    const pointerDistance = () => {
      const points = Array.from(pointersRef.current.values());
      if (points.length < 2) return null;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    const onPointerDown = (event: PointerEvent) => {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture?.(event.pointerId);
      if (pointersRef.current.size === 2) previousPinchDistanceRef.current = pointerDistance();
      autoRotateRef.current = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      const previous = pointersRef.current.get(event.pointerId);
      if (!previous) return;
      const next = { x: event.clientX, y: event.clientY };
      pointersRef.current.set(event.pointerId, next);
      const pivotObject = pivotRef.current;
      if (pointersRef.current.size === 1 && pivotObject) {
        pivotObject.rotation.y += (next.x - previous.x) * 0.009;
        pivotObject.rotation.x = THREE.MathUtils.clamp(pivotObject.rotation.x + (next.y - previous.y) * 0.006, -0.72, 0.42);
      } else if (pointersRef.current.size === 2) {
        const distance = pointerDistance();
        const previousDistance = previousPinchDistanceRef.current;
        if (distance && previousDistance) setCameraZoom(previousDistance / distance);
        previousPinchDistanceRef.current = distance;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) previousPinchDistanceRef.current = null;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setCameraZoom(event.deltaY > 0 ? 1.08 : 0.93);
      autoRotateRef.current = false;
    };
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('wheel', onWheel);
      draco.dispose();
      pivot.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      cameraRef.current = null;
      pivotRef.current = null;
    };
  }, []);

  return <section className="dawis-model-viewer" aria-label="Interactive Dawis Heritage Wharf 3D model">
    <div ref={stageRef} className="dawis-model-stage">
      <div className="dawis-model-sky" aria-hidden="true" />
      {isLoading && <LoadingSkeleton variant="model" className="dawis-model-loading" label="Preparing the Dawis model…" />}
      {loadError && <div className="dawis-model-loading"><span>3D model could not be loaded.</span></div>}
      {!isLoading && !loadError && <div className="dawis-model-hint"><Rotate3d size={14} /> Drag to explore · pinch to zoom</div>}
    </div>
    <div className="dawis-model-caption"><small>INTERACTIVE 3D PREVIEW</small><strong>Dawis Heritage Wharf</strong></div>
    <div className="dawis-model-summary" aria-label="Dawis Heritage Wharf model details">
      <div className="dawis-model-summary-stat"><small>HERITAGE SITE</small><strong>Sunrise Boulevard · Digos City</strong></div>
      <div className="dawis-model-summary-stat"><small>EXPLORE</small><strong>4 structural clues</strong></div>
      <p>Rotate the wharf to inspect the platform, piles, bollards, and shoreline rocks.</p>
    </div>
  </section>;
}
