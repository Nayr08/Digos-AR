'use client';

import { useEffect, useRef, useState } from 'react';
import { Rotate3d } from 'lucide-react';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type PointerPoint = { x: number; y: number };

type RewardModelViewerProps = {
  modelSrc: string;
  title: string;
  description: string;
};

export function RewardModelViewer({ modelSrc, title, description }: RewardModelViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'dawis-model-canvas';
    stage.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf0f8ff, 0x173323, 2.2));
    const keyLight = new THREE.DirectionalLight(0xfff0d2, 3.5);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8ad8ff, 1.4);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const pivot = new THREE.Group();
    pivot.rotation.order = 'YXZ';
    pivot.rotation.x = -0.12;
    pivot.rotation.y = -0.5;
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
    loader.load(modelSrc, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if ('roughness' in material) material.roughness = Math.max(Number(material.roughness) || 0.6, 0.55);
          if ('metalness' in material) material.metalness = Math.min(Number(material.metalness) || 0, 0.35);
        });
      });

      const sourceBox = new THREE.Box3().setFromObject(model);
      const sourceSize = sourceBox.getSize(new THREE.Vector3());
      const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.01);
      model.scale.setScalar(2.7 / maxDimension);
      model.position.set(-sourceCenter.x * model.scale.x, -sourceCenter.y * model.scale.y, -sourceCenter.z * model.scale.z);
      pivot.add(model);

      const fittedBox = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBox.getSize(new THREE.Vector3());
      const fittedMax = Math.max(fittedSize.x, fittedSize.y, fittedSize.z, 0.01);
      const viewDistance = (fittedMax / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.16;
      baseDistanceRef.current = viewDistance;
      camera.position.copy(new THREE.Vector3(1.25, 0.75, 1.45).normalize().multiplyScalar(viewDistance));
      camera.lookAt(0, 0, 0);
      setIsLoading(false);
    }, undefined, () => {
      if (!disposed) {
        setIsLoading(false);
        setLoadError(true);
      }
    });

    const setCameraZoom = (factor: number) => {
      const currentCamera = cameraRef.current;
      if (!currentCamera) return;
      const currentDistance = currentCamera.position.length() || baseDistanceRef.current;
      const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, baseDistanceRef.current * 0.55, baseDistanceRef.current * 1.5);
      currentCamera.position.normalize().multiplyScalar(nextDistance);
      currentCamera.lookAt(0, 0, 0);
    };
    cameraRef.current = camera;

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
        pivotObject.rotation.x = THREE.MathUtils.clamp(pivotObject.rotation.x + (next.y - previous.y) * 0.006, -0.8, 0.48);
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

    const animate = () => {
      if (disposed) return;
      if (autoRotateRef.current) pivot.rotation.y += 0.003;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

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
      pivotRef.current = null;
      cameraRef.current = null;
    };
  }, [modelSrc]);

  return <section className="reward-model-viewer" aria-label={`Interactive 3D ${title}`}>
    <div ref={stageRef} className="dawis-model-stage reward-model-stage">
      <div className="dawis-model-sky" aria-hidden="true" />
      {isLoading && <LoadingSkeleton variant="model" className="dawis-model-loading" label="Preparing your reward…" />}
      {loadError && <div className="dawis-model-loading"><span>3D reward could not be loaded.</span></div>}
      {!isLoading && !loadError && <div className="dawis-model-hint"><Rotate3d size={14} /> Drag to rotate · pinch to zoom</div>}
    </div>
    <div className="reward-model-caption"><small>INTERACTIVE REWARD</small><strong>{title}</strong><p>{description}</p></div>
  </section>;
}
