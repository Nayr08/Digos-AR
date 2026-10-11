import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CompilerBase } from '../node_modules/mind-ar/src/image-target/compiler-base.js';
import { buildTrackingImageList } from '../node_modules/mind-ar/src/image-target/image-list.js';
import { extractTrackingFeatures } from '../node_modules/mind-ar/src/image-target/tracker/extract-utils.js';
import '../node_modules/mind-ar/src/image-target/detector/kernels/cpu/index.js';

// Keep this order aligned with GLOBAL_TARGET_CONFIGS in ar-camera-screen.tsx.
const targetPaths = [
  'public/ar/targets/dawis-ar-target.webp',
  'public/ar/targets/old-dawis-reference.webp',
  'public/ar/targets/quest/terminal-platform.webp',
  'public/ar/targets/quest/mooring-bollards.webp',
  'public/ar/targets/quest/support-piles.webp',
  'public/ar/targets/quest/shoreline-rocks.webp',
  'public/ar/targets/digos-city-map-marker.webp',
  'public/ar/targets/eco-quest/eco-park-marker.webp',
  'public/ar/targets/eco-quest/eco-trail-gateway.webp',
  'public/ar/targets/eco-quest/lake-guardian.webp',
  'public/ar/targets/eco-quest/heritage-tree.webp',
  'public/ar/targets/eco-quest/barling-wrecks.webp',
];

class NodeOfflineCompiler extends CompilerBase {
  createProcessCanvas(_image) {
    let rawImage = null;
    return {
      getContext: () => ({
        drawImage: (source) => { rawImage = source.raw; },
        getImageData: () => ({ data: rawImage }),
      }),
    };
  }

  compileTrack({ progressCallback, targetImages, basePercent }) {
    return new Promise((resolve) => {
      const percentPerImage = (100 - basePercent) / targetImages.length;
      let percent = 0;
      const list = [];
      for (const targetImage of targetImages) {
        const imageList = buildTrackingImageList(targetImage);
        const percentPerAction = percentPerImage / imageList.length;
        const trackingData = extractTrackingFeatures(imageList, () => {
          percent += percentPerAction;
          progressCallback(basePercent + percent);
        });
        list.push(trackingData);
      }
      resolve(list);
    });
  }
}

const images = [];
for (const relativePath of targetPaths) {
  let pipeline = sharp(path.resolve(relativePath));
  if (relativePath.includes('/eco-quest/')) {
    pipeline = relativePath.endsWith('/eco-park-marker.webp')
      ? pipeline.resize({ width: 675, height: 450, fit: 'inside', withoutEnlargement: true })
      : pipeline.resize({ width: 540, height: 675, fit: 'fill' });
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  images.push({ width: info.width, height: info.height, raw: data });
  console.log(`Loaded ${relativePath} (${info.width}x${info.height})`);
}

const compiler = new NodeOfflineCompiler();
const data = await compiler.compileImageTargets(images, (progress) => {
  process.stdout.write(`\rCompiling global AR targets: ${progress.toFixed(1)}%`);
});
const outputPath = path.resolve('public/ar/targets/digosar-global.mind');
await fs.writeFile(outputPath, Buffer.from(compiler.exportData()));
process.stdout.write(`\nCompiled ${data.length} targets to ${outputPath}\n`);
