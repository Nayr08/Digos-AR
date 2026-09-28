'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type PresentationState = 'SEARCHING' | 'PRESENTING' | 'LOCKED' | 'SCANNING_ANOTHER' | 'CLOSED';
type InfoTab = 'about' | 'history' | 'location' | 'fact';

export const DAWIS_MINDAR_TRACKING = {
  filterMinCF: 0.0005,
  filterBeta: 1000,
  missTolerance: 8,
  warmupTolerance: 5,
} as const;

const INITIAL_DAWIS_ROTATION_Y = Math.PI / 4;

const infoSections: Record<InfoTab, { label: string; title: string; body: string }> = {
  about: { label: 'About', title: 'A waterfront heritage stop', body: 'A scenic wharf and promenade known for quiet views, local life, and heritage memories.' },
  history: { label: 'History', title: 'Stories meet the sea', body: 'A beloved waterfront landmark where generations of Digosnon stories meet the sea.' },
  location: { label: 'Location', title: 'Dawis, Digos City', body: 'Davao del Sur · Digos Gulf waterfront' },
  fact: { label: 'Fun Fact', title: 'A favorite sunset walk', body: 'Dawis faces the Digos Gulf and remains a favorite stop for sunset walks.' },
};

type DawisTargetConfig = {
  id: string;
  title: string;
  modelSrc?: string;
  modelFootprint?: number;
  isReward?: boolean;
  kind?: 'city-map';
  infoSections: Record<InfoTab, { label: string; title: string; body: string }>;
};

type DigosMapStop = {
  id: string;
  label: string;
  title: string;
  modelSrc: string;
  x: number;
  y: number;
  footprint: number;
  height: number;
  description: string;
};

const DIGOS_MAP_STOPS: DigosMapStop[] = [
  { id: 'eco-park', label: 'Eco Park', title: 'Digos City Eco Park and Arboretum', modelSrc: '/ar/models/ecopark.glb', x: 469 / 1262, y: 70 / 771, footprint: 0.22, height: 0.24, description: 'A green escape with a lake, garden paths, and the Eco Park landscape rising from the north of the city map.' },
  { id: 'mediatrix', label: 'Mediatrix', title: 'Mary, Mediatrix of All Grace Cathedral', modelSrc: '/ar/models/mediatrix-cathedral.glb', x: 619 / 1262, y: 335 / 771, footprint: 0.15, height: 0.27, description: 'Find the cathedral at the heart of Digos, marked here on the city map.' },
  { id: 'rizal-park', label: 'Rizal Park', title: 'Rizal Park', modelSrc: '/ar/models/rizal-park.glb', x: 614 / 1262, y: 438 / 771, footprint: 0.17, height: 0.23, description: 'The city park rises just south of the cathedral, with its own map pin and miniature scene.' },
  { id: 'dawis', label: 'Dawis Beach', title: 'Dawis Beach and Heritage Wharf', modelSrc: '/ar/models/dawis-heritage-wharf-mobile.glb', x: 799 / 1262, y: 612 / 771, footprint: 0.22, height: 0.18, description: 'Follow the coast to Dawis Beach and its heritage wharf at the southern edge of the map.' },
];

const MAP_BOARD_WIDTH = 2;
const MAP_BOARD_HEIGHT = MAP_BOARD_WIDTH * (771 / 1262);

const currentModel = '/ar/models/dawis-heritage-wharf-mobile.glb?v=current-quest-targets-1';
const historicalModel = '/ar/models/old-dawis-wharf-refinement2.glb?v=historical-preview-1';
const shorelineRewardModel = '/ar/rewards/gold-key.glb?v=reward-shoreline-1';
const bollardRewardModel = '/ar/rewards/rusty-bollard.glb?v=reward-bollard-1';
const supportRewardModel = '/ar/rewards/sonar-scanner.glb?v=reward-support-1';

const DAWIS_TARGET_CONFIGS: DawisTargetConfig[] = [
  {
    id: 'dawis',
    title: 'Dawis Wharf',
    modelSrc: currentModel,
    infoSections: {
      about: { label: 'About', title: 'A coastal heritage stop', body: 'Explore the Dawis waterfront and the landmarks that connect the community to the sea.' },
      history: { label: 'History', title: 'Stories along the shore', body: 'Dawis has long been a place where daily life, travel, and coastal memories meet.' },
      location: { label: 'Location', title: 'Dawis, Digos City', body: 'Davao del Sur · Digos Gulf waterfront' },
      fact: { label: 'Fun Fact', title: 'A favorite coastal view', body: 'The Dawis shoreline opens toward the gulf and the mountain horizon beyond.' },
    },
  },
  {
    id: 'old-dawis',
    title: 'Dawis Wharf · Historical Preview',
    modelSrc: historicalModel,
    infoSections,
  },
  {
    id: 'terminal-platform',
    title: 'Old Dawis',
    modelSrc: historicalModel,
    modelFootprint: 0.72,
    isReward: true,
    infoSections: {
      about: { label: 'Discovery', title: 'Congratulations! You found Old Dawis.', body: 'Explore the old Dawis wharf model. The widened seaward platform was the wharf’s main gathering and landing space.' },
      history: { label: 'Story', title: 'A wider landing', body: 'The terminal gives the narrow pier room to open out toward the gulf.' },
      location: { label: 'Route', title: 'Seaward end', body: 'Follow the pier to the broad platform at the end of the Dawis route.' },
      fact: { label: 'Next', title: 'Look for the bollards', body: 'Scan the bollard target next to continue the Dawis Wharf Walk.' },
    },
  },
  {
    id: 'mooring-bollards',
    title: 'Dawis Quest · Rusted Bollards',
    modelSrc: bollardRewardModel,
    modelFootprint: 0.72,
    isReward: true,
    infoSections: {
      about: { label: 'Discovery', title: 'Rusted bollards', body: 'Scan complete. These metal fixtures gave boat lines a secure point beside the terminal edge.' },
      history: { label: 'Story', title: 'A working wharf detail', body: 'Small utilitarian fittings reveal how the wharf supported everyday coastal activity.' },
      location: { label: 'Route', title: 'Terminal edges', body: 'Look around the corners and inner platform area for the mooring points.' },
      fact: { label: 'Next', title: 'Find the support piles', body: 'Scan the support-pile target to continue below the deck.' },
    },
  },
  {
    id: 'support-piles',
    title: 'Dawis Quest · Support Piles',
    modelSrc: supportRewardModel,
    modelFootprint: 0.72,
    isReward: true,
    infoSections: {
      about: { label: 'Discovery', title: 'Support piles', body: 'Scan complete. Rows of concrete piles hold the pier and terminal above the water.' },
      history: { label: 'Story', title: 'Structure below the tide', body: 'The piles show the practical engineering that made the long narrow wharf possible.' },
      location: { label: 'Route', title: 'Under the pier', body: 'Scan this target from the shoreline or beneath the terminal view.' },
      fact: { label: 'Next', title: 'Find the shoreline rocks', body: 'Scan the shoreline-rock target to finish the four discoveries.' },
    },
  },
  {
    id: 'shoreline-rocks',
    title: 'Dawis Quest · Shoreline Rocks',
    modelSrc: shorelineRewardModel,
    modelFootprint: 0.72,
    isReward: true,
    infoSections: {
      about: { label: 'Discovery', title: 'Shoreline rocks', body: 'Scan complete. Rock clusters mark the transition from the beach into the open water around Dawis.' },
      history: { label: 'Story', title: 'Where land meets sea', body: 'The rock edge helps frame the wharf and soften the shoreline around the landing.' },
      location: { label: 'Route', title: 'Beach and water edge', body: 'This is the first part of the route visitors see from the shore.' },
      fact: { label: 'Next', title: 'Heritage quiz unlocked', body: 'Return to Quest to test what you discovered on the Dawis Wharf Walk.' },
    },
  },
  {
    id: 'digos-city-map',
    title: 'Digos City · AR Map',
    kind: 'city-map',
    infoSections: {
      about: { label: 'Map', title: 'Four places, one city', body: 'Explore the raised landmarks and tap a pin to learn about each place.' },
      history: { label: 'Stops', title: 'From green spaces to the coast', body: 'Visit the Eco Park, Mediatrix Cathedral, Rizal Park, and Dawis Beach.' },
      location: { label: 'Location', title: 'Digos City', body: 'Davao del Sur · Philippines' },
      fact: { label: 'Explore', title: 'Choose a map pin', body: 'Tap one of the four place buttons to highlight its miniature landmark.' },
    },
  },
];

type MapLandmark = { id: string; group: THREE.Group; pin: THREE.Group };

function setMapSelection(scene: THREE.Object3D, selectedId: string) {
  const landmarks = scene.userData.mapLandmarks as MapLandmark[] | undefined;
  landmarks?.forEach(({ id, group, pin }) => {
    const selected = id === selectedId;
    group.userData.isSelected = selected;
    pin.userData.isSelected = selected;
    if (group.userData.hasRisen) group.scale.setScalar(selected ? 1.1 : 1);
    if (pin.userData.hasRisen) pin.scale.setScalar(selected ? 1.15 : 1);
    pin.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.emissive) standard.emissive.set(selected ? 0x426d0f : 0x14280a);
      });
    });
  });
}

async function buildDigosMapScene(gltfLoader: GLTFLoader) {
  const [mapTexture, models] = await Promise.all([
    new THREE.TextureLoader().loadAsync('/ar/maps/digos-city-map.webp'),
    Promise.all(DIGOS_MAP_STOPS.map((stop) => gltfLoader.loadAsync(stop.modelSrc))),
  ]);
  mapTexture.colorSpace = THREE.SRGBColorSpace;
  mapTexture.anisotropy = 8;

  const scene = new THREE.Group();
  scene.name = 'Digos_City_AR_Map';
  const boardTop = 0.015;
  const boardGroup = new THREE.Group();
  boardGroup.name = 'Digos_Map_Board_Rise';
  boardGroup.scale.setScalar(0.88);
  boardGroup.position.z = -0.14;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(MAP_BOARD_WIDTH, MAP_BOARD_HEIGHT, 0.035),
    [new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.82 }), new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.82 }), new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.82 }), new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.82 }), new THREE.MeshBasicMaterial({ map: mapTexture, color: 0xc4d9cb, toneMapped: false }), new THREE.MeshStandardMaterial({ color: 0x123d31, roughness: 0.82 })],
  );
  board.name = 'Digos_Map_Image_Board';
  board.position.z = -0.006;
  board.receiveShadow = false;
  boardGroup.add(board);

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x9bff57, roughness: 0.52, metalness: 0.12 });
  const frameThickness = 0.012;
  const edges = [
    { width: MAP_BOARD_WIDTH + frameThickness, height: frameThickness, x: 0, y: MAP_BOARD_HEIGHT / 2, z: boardTop },
    { width: MAP_BOARD_WIDTH + frameThickness, height: frameThickness, x: 0, y: -MAP_BOARD_HEIGHT / 2, z: boardTop },
    { width: frameThickness, height: MAP_BOARD_HEIGHT, x: -MAP_BOARD_WIDTH / 2, y: 0, z: boardTop },
    { width: frameThickness, height: MAP_BOARD_HEIGHT, x: MAP_BOARD_WIDTH / 2, y: 0, z: boardTop },
  ];
  edges.forEach(({ width, height, x, y, z }) => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.014), frameMaterial);
    edge.position.set(x, y, z);
    boardGroup.add(edge);
  });
  scene.add(boardGroup);
  scene.userData.mapBoardGroup = boardGroup;

  const landmarks: MapLandmark[] = [];
  DIGOS_MAP_STOPS.forEach((stop, index) => {
    const landmark = new THREE.Group();
    landmark.name = `Digos_Map_Landmark_${stop.id}`;
    const model = models[index].scene;
    model.rotation.x = Math.PI / 2;
    model.updateMatrixWorld(true);
    const rawBounds = new THREE.Box3().setFromObject(model);
    const rawSize = rawBounds.getSize(new THREE.Vector3());
    const footprint = Math.max(rawSize.x, rawSize.y);
    const scale = Math.min(stop.footprint / Math.max(footprint, 0.0001), stop.height / Math.max(rawSize.z, 0.0001));
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const center = fittedBounds.getCenter(new THREE.Vector3());
    const imageX = (stop.x - 0.5) * MAP_BOARD_WIDTH;
    const imageY = (0.5 - stop.y) * MAP_BOARD_HEIGHT;
    landmark.position.set(imageX, imageY, 0);
    model.position.set(-center.x, -center.y, boardTop + 0.004 - fittedBounds.min.z);
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
    });
    landmark.add(model);
    landmark.userData.mapStopId = stop.id;
    landmark.userData.riseIndex = index;
    landmark.userData.hasRisen = false;
    landmark.scale.setScalar(0.001);
    landmark.position.z = -0.14;
    scene.add(landmark);

    const pin = new THREE.Group();
    pin.name = `Digos_Map_Pin_${stop.id}`;
    pin.userData.finalZ = boardTop + 0.008;
    pin.userData.hasRisen = false;
    pin.scale.setScalar(0.001);
    pin.position.set(imageX, imageY, boardTop + 0.008 - 0.14);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x9bff57, emissive: 0x14280a, roughness: 0.42, metalness: 0.08 });
    const pinMaterial = new THREE.MeshStandardMaterial({ color: index === 3 ? 0xffcf62 : 0x9bff57, emissive: 0x14280a, roughness: 0.38, metalness: 0.08 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.009, 8, 28), ringMaterial);
    pin.add(ring);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.1, 8), pinMaterial);
    stem.rotation.x = Math.PI / 2;
    stem.position.z = Math.min(stop.height, 0.18) * 0.5;
    pin.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), pinMaterial);
    head.position.z = Math.min(stop.height, 0.18) + 0.012;
    pin.add(head);
    scene.add(pin);
    landmarks.push({ id: stop.id, group: landmark, pin });
  });
  scene.userData.mapLandmarks = landmarks;
  setMapSelection(scene, '');
  return scene;
}

function disposeBoard(object: THREE.Object3D) {
  object.traverse((child) => { const mesh = child as THREE.Mesh; mesh.geometry?.dispose(); const material = mesh.material; if (Array.isArray(material)) material.forEach((item) => { item.map?.dispose(); item.dispose(); }); else if (material) { material.map?.dispose(); material.dispose(); } });
}

const AR_MATERIAL_COLORS: Record<string, THREE.ColorRepresentation> = {
  OldWharf_Concrete: 0x777873,
  OldWharf_ConcreteVariant: 0x878980,
  OldWharf_DarkConcrete: 0x4b4d49,
  OldWharf_RustMetal: 0x6a2f1f,
  OldWharf_AlgaeStain: 0x2e4037,
};

function tuneDawisMaterials(model: THREE.Object3D) {
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const physicalMaterial = material as THREE.MeshStandardMaterial;
      const color = AR_MATERIAL_COLORS[physicalMaterial.name];
      if (color !== undefined && physicalMaterial.color) {
        physicalMaterial.color.set(color);
        physicalMaterial.needsUpdate = true;
      }
      if (physicalMaterial.name === 'OldWharf_Water') {
        physicalMaterial.depthWrite = false;
        mesh.renderOrder = -1;
      }
    });
  });
}

function prepareDawisModel(model: THREE.Object3D, targetFootprint = 2.65, centerOnTarget = false) {
  model.name = 'DHW_AR_Model';
  tuneDawisMaterials(model);
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
    }
  });

  // The exported scene is in metres. Fit its longest horizontal dimension to
  // about 2.65 MindAR units so the full wharf remains readable on a phone.
  const sourceBox = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const footprint = Math.max(sourceSize.x, sourceSize.z);
  if (footprint > 0) model.scale.setScalar(targetFootprint / footprint);
  model.updateMatrixWorld(true);

  // Center the footprint on the image target. Rewards float around its center;
  // landmark models sit on the target plane so their bases do not look buried.
  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  model.position.x -= fittedCenter.x;
  model.position.z -= fittedCenter.z;
  if (centerOnTarget) model.position.y -= fittedCenter.y;
  else model.position.y += 0.02 - fittedBox.min.y;
  model.updateMatrixWorld(true);
  return model;
}

type CameraState = 'requesting' | 'active' | 'denied' | 'unavailable' | 'tracking-error' | 'secure-context-error';
type MindARAnchor = {
  group: THREE.Group;
  visible?: boolean;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
  onTargetUpdate?: () => void;
};
type MindARInstance = {
  start: () => Promise<void>;
  stop: () => void;
  addAnchor: (targetIndex: number) => MindARAnchor;
  renderer: { setAnimationLoop: (callback: (() => void) | null) => void; render: (scene: unknown, camera: unknown) => void; dispose?: () => void; domElement?: HTMLElement };
  cssRenderer?: { domElement?: HTMLElement };
  scene: unknown;
  camera: unknown;
};

export function ARCameraScreen({ onBack, onTargetScanned, onOpenQuest }: { onBack: () => void; onTargetScanned?: (targetId: string) => void; onOpenQuest?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARInstance | null>(null);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const modelPivotRef = useRef<THREE.Group | null>(null);
  const anchorRef = useRef<MindARAnchor | null>(null);
  const anchorRefsRef = useRef<MindARAnchor[]>([]);
  const activeTargetConfigRef = useRef<DawisTargetConfig>(DAWIS_TARGET_CONFIGS[0]);
  const animationFrameRef = useRef<number | null>(null);
  const infoTimerRef = useRef<number | null>(null);
  const modelLoadingRef = useRef(false);
  const modelGenerationRef = useRef(0);
  const activeTargetIdRef = useRef<string | null>(null);
  const modelLockedRef = useRef(false);
  const hasPresentedCurrentTargetRef = useRef(false);
  const latestAnchorMatrixRef = useRef<THREE.Matrix4 | null>(null);
  const lockedAnchorMatrixRef = useRef<THREE.Matrix4 | null>(null);
  const pointerDragRef = useRef<{ pointerId: number | null; x: number; y: number }>({ pointerId: null, x: 0, y: 0 });
  const pointerPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const modelBaseScaleRef = useRef(1);
  const focusedMapStopIdRef = useRef<string | null>(null);
  const mapFocusAnimationFrameRef = useRef<number | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [isDawisDetected, setIsDawisDetected] = useState(false);
  const [presentationState, setPresentationState] = useState<PresentationState>('SEARCHING');
  const presentationStateRef = useRef<PresentationState>('SEARCHING');
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>('about');
  const [activeTargetTitle, setActiveTargetTitle] = useState(DAWIS_TARGET_CONFIGS[0].title);
  const [activeInfoSections, setActiveInfoSections] = useState(DAWIS_TARGET_CONFIGS[0].infoSections);
  const [activeTargetIsReward, setActiveTargetIsReward] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(false);
  const [selectedMapStopId, setSelectedMapStopId] = useState('eco-park');
  const [focusedMapStopId, setFocusedMapStopId] = useState<string | null>(null);

  const setPresentation = useCallback((next: PresentationState) => {
    presentationStateRef.current = next;
    if (mountedRef.current) setPresentationState(next);
  }, []);

  const focusMapStop = useCallback((stopId: string) => {
    const model = modelRef.current;
    const pivot = modelPivotRef.current;
    if (!model || !pivot || activeTargetConfigRef.current.kind !== 'city-map') return;

    const nextFocusId = focusedMapStopIdRef.current === stopId ? null : stopId;
    const landmarks = model.userData.mapLandmarks as MapLandmark[] | undefined;
    const focusedLandmark = landmarks?.find((landmark) => landmark.id === nextFocusId);
    const centerY = 0.12;
    const focusPoint = focusedLandmark ? { x: focusedLandmark.group.position.x, y: focusedLandmark.group.position.y, centerY } : null;
    const targetScale = focusPoint ? 2.35 : 1;
    const targetPosition = focusPoint
      ? new THREE.Vector3(-focusPoint.x * targetScale, focusPoint.centerY - focusPoint.y * targetScale, 0)
      : new THREE.Vector3(0, 0, 0);
    const fromScale = model.scale.x;
    const fromPosition = model.position.clone();
    const fromRotation = new THREE.Vector3(pivot.rotation.x, pivot.rotation.y, pivot.rotation.z);
    const toRotation = new THREE.Vector3(0, 0, 0);

    if (mapFocusAnimationFrameRef.current !== null) cancelAnimationFrame(mapFocusAnimationFrameRef.current);
    focusedMapStopIdRef.current = nextFocusId;
    setFocusedMapStopId(nextFocusId);
    model.userData.mapFocusAnchor = focusPoint;
    modelBaseScaleRef.current = targetScale;
    setMapSelection(model, nextFocusId ?? '');

    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 760;
    const startedAt = performance.now();
    const animateFocus = (now: number) => {
      if (modelRef.current !== model || modelPivotRef.current !== pivot) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      model.scale.setScalar(THREE.MathUtils.lerp(fromScale, targetScale, eased));
      model.position.lerpVectors(fromPosition, targetPosition, eased);
      pivot.rotation.set(
        THREE.MathUtils.lerp(fromRotation.x, toRotation.x, eased),
        THREE.MathUtils.lerp(fromRotation.y, toRotation.y, eased),
        THREE.MathUtils.lerp(fromRotation.z, toRotation.z, eased),
      );
      if (progress < 1) mapFocusAnimationFrameRef.current = requestAnimationFrame(animateFocus);
      else {
        model.scale.setScalar(targetScale);
        model.position.copy(targetPosition);
        pivot.rotation.set(0, 0, 0);
        mapFocusAnimationFrameRef.current = null;
      }
    };
    mapFocusAnimationFrameRef.current = requestAnimationFrame(animateFocus);
  }, []);

  const stopTracking = useCallback(() => {
    const mindar = mindarRef.current;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (mapFocusAnimationFrameRef.current !== null) cancelAnimationFrame(mapFocusAnimationFrameRef.current);
    mapFocusAnimationFrameRef.current = null;
    if (infoTimerRef.current !== null) window.clearTimeout(infoTimerRef.current);
    infoTimerRef.current = null;
    if (mindar) {
      mindar.renderer.setAnimationLoop(null);
      mindar.stop();
      mindar.renderer.dispose?.();
      const rendererElement = mindar.renderer.domElement;
      const cssRendererElement = mindar.cssRenderer?.domElement;
      rendererElement?.parentElement?.removeChild(rendererElement);
      cssRendererElement?.parentElement?.removeChild(cssRendererElement);
    }
    if (modelRef.current) { disposeBoard(modelRef.current); modelRef.current = null; }
    modelPivotRef.current = null;
    anchorRef.current = null;
    anchorRefsRef.current = [];
    modelLoadingRef.current = false;
    modelGenerationRef.current += 1;
    activeTargetIdRef.current = null;
    modelLockedRef.current = false;
    hasPresentedCurrentTargetRef.current = false;
    latestAnchorMatrixRef.current = null;
    lockedAnchorMatrixRef.current = null;
    activeTargetConfigRef.current = DAWIS_TARGET_CONFIGS[0];
    pointerDragRef.current.pointerId = null;
    pointerPointsRef.current.clear();
    pinchDistanceRef.current = null;
    mindarRef.current = null;
  }, []);

  const startTracking = useCallback(async () => {
    const attempt = ++attemptRef.current;
    stopTracking();
    setActiveTargetId(null);
    setIsDawisDetected(false);
    setPresentation('SEARCHING');
    setInfoVisible(false);
    setActiveInfoTab('about');
    setSelectedMapStopId('eco-park');
    focusedMapStopIdRef.current = null;
    setFocusedMapStopId(null);
    setActiveTargetTitle(DAWIS_TARGET_CONFIGS[0].title);
    setActiveInfoSections(DAWIS_TARGET_CONFIGS[0].infoSections);
    setActiveTargetIsReward(false);
    setIsModelLoading(false);
    setModelLoadError(false);
    setCameraState('requesting');
    if (!mountedRef.current || !containerRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('secure-context-error');
      return;
    }
    try {
      const { MindARThree } = await import('mind-ar/dist/mindar-image-three.prod.js');
      if (!mountedRef.current || attempt !== attemptRef.current || !containerRef.current) return;
      const mindar = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: '/ar/targets/dawis-quest.mind',
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        ...DAWIS_MINDAR_TRACKING,
      }) as MindARInstance;
      mindarRef.current = mindar;
      const anchors = DAWIS_TARGET_CONFIGS.map((_, targetIndex) => mindar.addAnchor(targetIndex));
      anchorRefsRef.current = anchors;
      latestAnchorMatrixRef.current = new THREE.Matrix4();
      lockedAnchorMatrixRef.current = null;

      const targetPivots = new Map<string, THREE.Group>();
      DAWIS_TARGET_CONFIGS.forEach((target, targetIndex) => {
        const modelPivot = new THREE.Group();
        modelPivot.name = `DHW_ModelPivot_${target.id}`;
        modelPivot.userData.infoSections = target.infoSections;
        modelPivot.rotation.order = 'YXZ';
        modelPivot.rotation.y = INITIAL_DAWIS_ROTATION_Y;
        anchors[targetIndex].group.add(modelPivot);
        targetPivots.set(target.id, modelPivot);

        const ambient = new THREE.AmbientLight(0xffffff, 1.8);
        const warmKey = new THREE.DirectionalLight(0xffe2b0, 2.2);
        warmKey.position.set(1.5, 2.5, 2);
        const fill = new THREE.DirectionalLight(0x9bd7ff, 0.8);
        fill.position.set(-2, 1, 1);
        modelPivot.add(ambient, warmKey, fill);
      });

      const loadDawisModel = (target: DawisTargetConfig, anchor: MindARAnchor, modelPivot: THREE.Group) => {
        if (modelLoadingRef.current || modelRef.current || !mountedRef.current) return;
        modelLoadingRef.current = true;
        const modelGeneration = ++modelGenerationRef.current;
        setIsModelLoading(true);
        setModelLoadError(false);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/ar/draco/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        const loading = target.kind === 'city-map'
          ? buildDigosMapScene(gltfLoader)
          : target.modelSrc
            ? gltfLoader.loadAsync(target.modelSrc).then((gltf) => prepareDawisModel(gltf.scene, target.modelFootprint, target.isReward))
            : Promise.reject(new Error(`No model configured for ${target.id}`));
        void loading.then((model) => {
          if (!mountedRef.current || attempt !== attemptRef.current || modelGeneration !== modelGenerationRef.current || mindarRef.current !== mindar) {
            disposeBoard(model);
            dracoLoader.dispose();
            return;
          }
          const isCityMap = target.kind === 'city-map';
          const finalScale = model.scale.clone();
          const finalPosition = model.position.clone();
          modelBaseScaleRef.current = isCityMap ? 1 : finalScale.x;
          if (!isCityMap && !target.isReward) finalPosition.y -= 0.05;
          const startScale = finalScale.clone().multiplyScalar(isCityMap ? 1 : 0.78);
          const startPosition = finalPosition.clone();
          if (!isCityMap && !target.isReward) startPosition.y -= 0.03;
          model.scale.copy(startScale);
          model.position.copy(startPosition);
          modelPivot.add(model);
          modelRef.current = model;
          modelLoadingRef.current = false;
          setIsModelLoading(false);
          setModelLoadError(false);
          setInfoVisible(false);
          if (infoTimerRef.current !== null) window.clearTimeout(infoTimerRef.current);
          infoTimerRef.current = window.setTimeout(() => {
            if (mountedRef.current && attempt === attemptRef.current) setInfoVisible(true);
          }, target.kind === 'city-map' ? 2300 : 320);
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const duration = reducedMotion ? 1 : isCityMap ? 4000 : 820;
          const startedAt = performance.now();
          const animatePresentation = (now: number) => {
            if (!mountedRef.current || attempt !== attemptRef.current || modelRef.current !== model) return;
            const progress = Math.min((now - startedAt) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            model.scale.lerpVectors(startScale, finalScale, eased);
            model.position.lerpVectors(startPosition, finalPosition, eased);
            if (isCityMap) {
              const boardGroup = model.userData.mapBoardGroup as THREE.Group | undefined;
              if (boardGroup) {
                const boardProgress = THREE.MathUtils.clamp(progress * 2, 0, 1);
                const boardEase = 1 - Math.pow(1 - boardProgress, 3);
                boardGroup.scale.setScalar(0.88 + (1 - 0.88) * boardEase);
                boardGroup.position.z = -0.14 * (1 - boardEase);
              }
              const stopPhase = THREE.MathUtils.clamp((progress - 0.5) * 2, 0, 1);
              const landmarks = model.userData.mapLandmarks as MapLandmark[] | undefined;
              landmarks?.forEach(({ id, group, pin }, index) => {
                const stagger = index * 0.11;
                const localProgress = THREE.MathUtils.clamp((stopPhase - stagger) / (1 - stagger), 0, 1);
                const rise = 1 - Math.pow(1 - localProgress, 3);
                const selectedScale = id === focusedMapStopIdRef.current ? 1.1 : 1;
                group.scale.setScalar(0.001 + (selectedScale - 0.001) * rise);
                group.position.z = -0.14 * (1 - rise);
                group.userData.hasRisen = rise >= 1;
                const pinScale = id === focusedMapStopIdRef.current ? 1.15 : 1;
                pin.scale.setScalar(0.001 + (pinScale - 0.001) * rise);
                pin.position.z = (pin.userData.finalZ as number) - 0.14 * (1 - rise);
                pin.userData.hasRisen = rise >= 1;
              });
            }
            // The requestAnimationFrame loop intentionally reschedules this attempt-local callback.
            // oxlint-disable-next-line react/react-compiler
            if (progress < 1) animationFrameRef.current = requestAnimationFrame(animatePresentation);
            else {
              if (isCityMap) setMapSelection(model, focusedMapStopIdRef.current ?? '');
              animationFrameRef.current = null;
              lockedAnchorMatrixRef.current = (latestAnchorMatrixRef.current ?? anchor.group.matrix).clone();
              anchor.group.matrix.copy(lockedAnchorMatrixRef.current);
              anchor.group.matrixWorldNeedsUpdate = true;
              modelLockedRef.current = true;
              setPresentation('LOCKED');
            }
          };
          animationFrameRef.current = requestAnimationFrame(animatePresentation);
          dracoLoader.dispose();
        }).catch(() => {
          if (!mountedRef.current || attempt !== attemptRef.current || modelGeneration !== modelGenerationRef.current || mindarRef.current !== mindar) {
            dracoLoader.dispose();
            return;
          }
          modelLoadingRef.current = false;
          setIsModelLoading(false);
          setModelLoadError(true);
          setInfoVisible(true);
          modelLockedRef.current = true;
          setPresentation('LOCKED');
          dracoLoader.dispose();
        });
      };

      anchors.forEach((anchor, targetIndex) => {
        const target = DAWIS_TARGET_CONFIGS[targetIndex];
        const modelPivot = targetPivots.get(target.id);
        if (!modelPivot) return;
        anchor.onTargetFound = () => {
          if (presentationStateRef.current !== 'SEARCHING' || activeTargetIdRef.current || hasPresentedCurrentTargetRef.current || modelLockedRef.current) return;
          activeTargetConfigRef.current = target;
          activeTargetIdRef.current = target.id;
          setActiveTargetId(target.id);
          setActiveTargetTitle(target.title);
          setActiveInfoSections(target.infoSections);
          setActiveTargetIsReward(Boolean(target.isReward));
          if (target.kind === 'city-map') {
            setSelectedMapStopId('eco-park');
            focusedMapStopIdRef.current = null;
            setFocusedMapStopId(null);
          }
          hasPresentedCurrentTargetRef.current = true;
          modelLockedRef.current = false;
          anchorRef.current = anchor;
          modelPivotRef.current = modelPivot;
          modelPivot.rotation.set(0, target.kind === 'city-map' ? 0 : INITIAL_DAWIS_ROTATION_Y, 0);
          modelPivot.userData.infoSections = target.infoSections;
          if (latestAnchorMatrixRef.current) latestAnchorMatrixRef.current.copy(anchor.group.matrix);
          setPresentation('PRESENTING');
          anchor.group.visible = true;
          if (mountedRef.current) setIsDawisDetected(true);
          onTargetScanned?.(target.id);
          loadDawisModel(target, anchor, modelPivot);
        };
        // Keep the active information scene at its last tracked pose until the
        // user exits or scans another target instead of hiding it on a brief dip.
        anchor.onTargetLost = () => {
          if (anchorRef.current !== anchor || !activeTargetIdRef.current) {
            anchor.group.visible = false;
            return;
          }
          anchor.group.visible = true;
          if (lockedAnchorMatrixRef.current) {
            anchor.group.matrix.copy(lockedAnchorMatrixRef.current);
            anchor.group.matrixWorldNeedsUpdate = true;
          }
          if (mountedRef.current) setIsDawisDetected(true);
        };
        anchor.onTargetUpdate = () => {
          if (anchorRef.current === anchor && !modelLockedRef.current && anchor.visible && latestAnchorMatrixRef.current) latestAnchorMatrixRef.current.copy(anchor.group.matrix);
        };
      });
      await mindar.start();
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      const video = containerRef.current.querySelector('video');
      if (video) video.className = 'ar-live-video';
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) canvas.className = 'ar-mindar-canvas';
      mindar.renderer.setAnimationLoop(() => {
        const activeAnchor = anchorRef.current;
        if (activeAnchor && modelLockedRef.current && lockedAnchorMatrixRef.current) {
          activeAnchor.group.matrix.copy(lockedAnchorMatrixRef.current);
          activeAnchor.group.matrixWorldNeedsUpdate = true;
          activeAnchor.group.visible = true;
        } else if (activeAnchor && activeTargetIdRef.current) {
          activeAnchor.group.visible = true;
          if (activeAnchor.visible && latestAnchorMatrixRef.current) latestAnchorMatrixRef.current.copy(activeAnchor.group.matrix);
        }
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
  }, [onTargetScanned, setPresentation, stopTracking]);

  useEffect(() => {
    mountedRef.current = true;
    // MindAR owns camera permission and tracking initialization on mount.
    // oxlint-disable-next-line react/react-compiler
    void startTracking();
    return () => { mountedRef.current = false; attemptRef.current += 1; stopTracking(); };
  }, [startTracking, stopTracking]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const pointerPoints = pointerPointsRef.current;
    const getPinchDistance = () => {
      const points = Array.from(pointerPointsRef.current.values());
      if (points.length < 2) return null;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    const endDrag = (event: PointerEvent) => {
      if (!pointerPointsRef.current.has(event.pointerId) && pointerDragRef.current.pointerId !== event.pointerId) return;
      pointerPointsRef.current.delete(event.pointerId);
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (pointerPointsRef.current.size >= 2) {
        pointerDragRef.current.pointerId = null;
        pinchDistanceRef.current = getPinchDistance();
      } else if (pointerPointsRef.current.size === 1) {
        const [pointerId, point] = Array.from(pointerPointsRef.current.entries())[0];
        pointerDragRef.current = { pointerId, x: point.x, y: point.y };
        pinchDistanceRef.current = null;
      } else {
        pointerDragRef.current.pointerId = null;
        pinchDistanceRef.current = null;
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!modelPivotRef.current || !modelRef.current || !activeTargetIdRef.current) return;
      if (target instanceof Element && target.closest('button,[role="tab"],.ar-info-layer,.ar-placement-actions,.ar-camera-controls')) return;
      if (mapFocusAnimationFrameRef.current !== null) {
        cancelAnimationFrame(mapFocusAnimationFrameRef.current);
        mapFocusAnimationFrameRef.current = null;
        if (!focusedMapStopIdRef.current) modelRef.current.position.set(0, 0, 0);
      }
      pointerPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      element.setPointerCapture?.(event.pointerId);
      if (pointerPointsRef.current.size === 1) {
        pointerDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        pinchDistanceRef.current = null;
      } else {
        pointerDragRef.current.pointerId = null;
        pinchDistanceRef.current = getPinchDistance();
      }
      event.preventDefault();
    };
    const handlePointerMove = (event: PointerEvent) => {
      const point = pointerPointsRef.current.get(event.pointerId);
      if (!point) return;
      point.x = event.clientX;
      point.y = event.clientY;
      const pivot = modelPivotRef.current;
      const model = modelRef.current;
      if (!pivot || !model) return;
      if (pointerPointsRef.current.size >= 2) {
        const currentDistance = getPinchDistance();
        const previousDistance = pinchDistanceRef.current;
        const baseScale = modelBaseScaleRef.current;
        if (currentDistance && previousDistance && baseScale > 0) {
          const nextScale = THREE.MathUtils.clamp(model.scale.x * (currentDistance / previousDistance), baseScale * 0.45, baseScale * 1.7);
          model.scale.setScalar(nextScale);
          const focusPoint = model.userData.mapFocusAnchor as { x: number; y: number; centerY: number } | null | undefined;
          if (focusPoint) model.position.set(-focusPoint.x * nextScale, focusPoint.centerY - focusPoint.y * nextScale, model.position.z);
        }
        pinchDistanceRef.current = currentDistance;
        event.preventDefault();
        return;
      }
      if (pointerDragRef.current.pointerId !== event.pointerId) return;
      const dx = event.clientX - pointerDragRef.current.x;
      const dy = event.clientY - pointerDragRef.current.y;
      pointerDragRef.current.x = event.clientX;
      pointerDragRef.current.y = event.clientY;
      if (activeTargetConfigRef.current.kind === 'city-map') pivot.rotation.z += dx * 0.008;
      else pivot.rotation.y += dx * 0.008;
      // Keep pitch unrestricted so users can orbit from the side view to a
      // full top view and continue through every angle.
      pivot.rotation.x -= dy * 0.008;
      event.preventDefault();
    };
    element.addEventListener('pointerdown', handlePointerDown, { passive: false });
    element.addEventListener('pointermove', handlePointerMove, { passive: false });
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    element.addEventListener('lostpointercapture', endDrag);
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', endDrag);
      element.removeEventListener('pointercancel', endDrag);
      element.removeEventListener('lostpointercapture', endDrag);
      pointerPoints.clear();
      pinchDistanceRef.current = null;
      pointerDragRef.current.pointerId = null;
    };
  }, []);

  useEffect(() => {
    if (modelPivotRef.current) modelPivotRef.current.userData.activeInfoTab = activeInfoTab;
  }, [activeInfoTab]);

  useEffect(() => {
    if (activeTargetIdRef.current === 'digos-city-map' && modelRef.current) setMapSelection(modelRef.current, focusedMapStopId ?? '');
  }, [focusedMapStopId]);

  const scanAnother = useCallback(() => {
    setPresentation('SCANNING_ANOTHER');
    if (!mindarRef.current || !anchorRef.current) {
      void startTracking();
      return;
    }
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (mapFocusAnimationFrameRef.current !== null) cancelAnimationFrame(mapFocusAnimationFrameRef.current);
    mapFocusAnimationFrameRef.current = null;
    pointerPointsRef.current.clear();
    pinchDistanceRef.current = null;
    pointerDragRef.current.pointerId = null;
    if (infoTimerRef.current !== null) window.clearTimeout(infoTimerRef.current);
    infoTimerRef.current = null;
    modelGenerationRef.current += 1;
    modelBaseScaleRef.current = 1;
    if (modelRef.current) { disposeBoard(modelRef.current); modelRef.current = null; }
    modelLoadingRef.current = false;
    modelPivotRef.current?.rotation.set(0, INITIAL_DAWIS_ROTATION_Y, 0);
    activeTargetIdRef.current = null;
    setActiveTargetId(null);
    hasPresentedCurrentTargetRef.current = false;
    modelLockedRef.current = false;
    latestAnchorMatrixRef.current = new THREE.Matrix4();
    lockedAnchorMatrixRef.current = null;
    anchorRefsRef.current.forEach((anchor) => {
      anchor.visible = false;
      anchor.group.visible = false;
      anchor.group.matrix.identity();
      anchor.group.matrixWorldNeedsUpdate = true;
    });
    anchorRef.current = null;
    activeTargetConfigRef.current = DAWIS_TARGET_CONFIGS[0];
    setSelectedMapStopId('eco-park');
    focusedMapStopIdRef.current = null;
    setFocusedMapStopId(null);
    setInfoVisible(false);
    setIsDawisDetected(false);
    setIsModelLoading(false);
    setModelLoadError(false);
    setActiveInfoTab('about');
    setActiveTargetTitle(DAWIS_TARGET_CONFIGS[0].title);
    setActiveInfoSections(DAWIS_TARGET_CONFIGS[0].infoSections);
    setActiveTargetIsReward(false);
    setPresentation('SEARCHING');
  }, [setPresentation, startTracking]);

  const exitCamera = () => { setPresentation('CLOSED'); attemptRef.current += 1; stopTracking(); onBack(); };
  const isSearching = presentationState === 'SEARCHING' || presentationState === 'SCANNING_ANOTHER';
  const isDawisEntryTarget = activeTargetId === 'dawis';
  const isCityMapTarget = activeTargetId === 'digos-city-map';
  const selectedMapStop = DIGOS_MAP_STOPS.find((stop) => stop.id === selectedMapStopId) ?? DIGOS_MAP_STOPS[0];
  const currentInfo = activeInfoSections[activeInfoTab];

  return <div ref={containerRef} className={`screen ar-camera-mode camera-${cameraState} ar-state-${presentationState.toLowerCase()} ${isDawisDetected ? 'target-detected' : ''}`}>
    <div className="ar-camera-gradient" aria-hidden="true" />
    {cameraState === 'active' ? <>
      <header className="ar-camera-controls"><button type="button" onClick={exitCamera} aria-label="Exit AR camera"><ArrowLeft size={20} /></button><div><small>AR PREVIEW</small><strong>{isSearching ? 'Scanning...' : activeTargetTitle}</strong></div></header>
       <section className="ar-scanner-stage" aria-label="DigosAR image-target scanner preview"><div className={`ar-scanner-frame ${isSearching ? '' : 'is-detected'}`} aria-hidden="true"><i className="corner top-left" /><i className="corner top-right" /><i className="corner bottom-left" /><i className="corner bottom-right" />{isSearching && <><span className="ar-scan-line" /><span className="ar-target-dot dot-one" /><span className="ar-target-dot dot-two" /></>}</div><div className="ar-scanner-copy">{isSearching ? <><strong>Point your camera at a DigosAR marker</strong><span>For the four-stop diorama, scan the separate Digos city-map card.</span></> : <><strong><Check size={16} /> {activeTargetTitle} found</strong><span>{isDawisEntryTarget ? 'Quest unlocked. Continue to the Dawis route.' : isCityMapTarget ? 'Four landmarks are rising. Choose a place below.' : presentationState === 'PRESENTING' ? 'Preparing the model...' : 'Model locked to the last tracked pose.'}</span></>}</div></section>
      {!isSearching && <>
        {!isCityMapTarget && <output className="ar-model-status">{isModelLoading ? `Preparing ${activeTargetTitle} model…` : modelLoadError ? 'Model could not be loaded' : activeTargetTitle}</output>}
        <section className={`ar-info-layer ${isCityMapTarget ? 'is-city-map' : ''} ${infoVisible ? 'is-visible' : ''}`} aria-label={`${activeTargetTitle} information`}>
           <div className="ar-info-title-card"><small>{isCityMapTarget ? 'DIGOS CITY · AR MAP' : activeTargetIsReward ? 'REWARD UNLOCKED · DAWIS QUEST' : 'HERITAGE SITE · DIGOS CITY'}</small><strong>{activeTargetTitle}</strong><span>{isModelLoading ? `Preparing ${isCityMapTarget ? 'the city diorama' : activeTargetIsReward ? 'your collectible' : 'the mobile model'}…` : modelLoadError ? 'Try scanning again.' : isCityMapTarget ? focusedMapStopId ? `Focused on ${selectedMapStop.label}. Tap it again for the full map; pinch to zoom.` : 'Lay the marker flat. Tap a place to zoom in; drag to rotate and pinch to zoom.' : activeTargetIsReward ? 'Drag to orbit · pinch to inspect your collectible.' : isDawisEntryTarget ? 'Dawis quest unlocked. Open Quest to begin.' : 'Explore this Dawis landmark in AR.'}</span></div>
          {!modelLoadError && (isCityMapTarget ? <div className="ar-info-panel ar-city-map-panel"><nav className="ar-city-map-stops" aria-label="Digos city map locations">{DIGOS_MAP_STOPS.map((stop, index) => <button key={stop.id} type="button" aria-pressed={focusedMapStopId === stop.id} aria-label={focusedMapStopId === stop.id ? `Return to full map from ${stop.label}` : `Zoom to ${stop.label}`} className={focusedMapStopId === stop.id ? 'active' : ''} disabled={presentationState !== 'LOCKED' || isModelLoading || modelLoadError} onClick={() => { setSelectedMapStopId(stop.id); focusMapStop(stop.id); }}><span>{String(index + 1).padStart(2, '0')}</span>{stop.label}</button>)}</nav><div className="ar-info-detail"><strong>{selectedMapStop.title}</strong><p>{selectedMapStop.description}</p></div></div> : <div className="ar-info-panel"><div className="ar-info-tabs" role="tablist" aria-label="Dawis information"><>{(Object.keys(activeInfoSections) as InfoTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeInfoTab === tab} className={activeInfoTab === tab ? 'active' : ''} onClick={() => setActiveInfoTab(tab)}>{activeInfoSections[tab].label}</button>)}</></div><div className="ar-info-detail"><strong>{currentInfo.title}</strong><p>{currentInfo.body}</p></div></div>)}
        </section>
         {presentationState === 'LOCKED' && <div className="ar-placement-actions"><div>{isDawisEntryTarget && onOpenQuest ? <><button type="button" onClick={onOpenQuest}>Open Quest</button><button type="button" className="secondary" onClick={exitCamera}>Close</button></> : activeTargetIsReward && onOpenQuest ? <><button type="button" onClick={onOpenQuest}>Return to Quest</button><button type="button" className="secondary" onClick={scanAnother}>Scan another</button></> : <><button type="button" onClick={scanAnother}>Scan another</button><button type="button" className="secondary" onClick={exitCamera}>Close</button></>}</div></div>}
      </>}
    </> : <output className="ar-camera-state">{cameraState === 'requesting' ? <><span className="camera-start-icon"><Camera size={28} /></span><h1>Starting camera...</h1></> : cameraState === 'denied' ? <><Camera size={36} /><h1>Camera access is required to use DigosAR.</h1><p>Allow camera permission in your browser, then try again.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : cameraState === 'secure-context-error' ? <><Camera size={36} /><h1>Camera access requires HTTPS.</h1><p>Open DigosAR using the Vercel HTTPS link to use AR tracking.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : cameraState === 'tracking-error' ? <><Camera size={36} /><h1>Unable to start AR tracking.</h1><p>Check your connection and camera permission, then try again.</p><button type="button" onClick={() => void startTracking()}>Try again</button><button className="secondary" type="button" onClick={exitCamera}>Go back</button></> : <><Camera size={36} /><h1>Camera is unavailable on this device.</h1><p>Check that your device has a camera and that no other app is using it.</p><button type="button" onClick={exitCamera}>Go back</button></>}</output>}
  </div>;
}
