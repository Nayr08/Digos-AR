import * as THREE from 'three';

const ECO_PARK_MATERIAL_COLORS: Record<string, THREE.ColorRepresentation> = {
  'Charcoal display plinth': 0x29473a,
  'Tree bark': 0x67452c,
  'Canopy deep green': 0x20552b,
  'Canopy mid green': 0x3b813d,
  'Canopy sunlit green': 0x78a94b,
  'Dock timber': 0x8a5a35,
};

/** Restore the authored Eco Park palette for materials exported without color factors. */
export function applyEcoParkModelMaterials(model: THREE.Object3D) {
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const color = ECO_PARK_MATERIAL_COLORS[material.name];
      if (color === undefined || !('color' in material)) return;

      (material as THREE.MeshStandardMaterial).color.set(color);
      material.needsUpdate = true;
    });
  });
}
