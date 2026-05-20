import * as THREE from 'three';

const SIZE = 512;
const DEFAULT_MODEL = 'zd230';
const LOGO_URL = '/zebra.png';

let cachedTexture: THREE.CanvasTexture | null = null;

/**
 * Returns a single shared CanvasTexture used as the `map` of every box
 * InstancedMesh. The canvas is painted synchronously with a cardboard base so
 * the GPU has something immediately; the Zebra logo is loaded asynchronously
 * and re-painted with `texture.needsUpdate = true` once the image is ready.
 */
export function getBoxTexture(model: string = DEFAULT_MODEL): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;
  if (typeof document === 'undefined') {
    // SSR guard — Scene is dynamic-imported with ssr:false so this shouldn't fire.
    return new THREE.CanvasTexture(new Image());
  }

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  paintCardboard(ctx);
  paintModelText(ctx, model);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    paintCardboard(ctx);
    paintLogo(ctx, img);
    paintModelText(ctx, model);
    texture.needsUpdate = true;
  };
  img.onerror = () => {
    // logo failed to load — leave the base + text only
  };
  img.src = LOGO_URL;

  cachedTexture = texture;
  return texture;
}

function paintCardboard(ctx: CanvasRenderingContext2D) {
  // Light cardboard base — instance color tints this multiplicatively
  ctx.fillStyle = '#e6d4a4';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Fiber grain
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120,80,30,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1, 1);
  }

  // Soft horizontal streaks
  for (let y = 0; y < SIZE; y += 6) {
    ctx.fillStyle = `rgba(90,60,20,${Math.random() * 0.02})`;
    ctx.fillRect(0, y, SIZE, 1);
  }

  // Edge shadow — sells the carton tape look
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, 'rgba(60,30,0,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(60,30,0,0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Taped border seam
  ctx.fillStyle = 'rgba(220, 190, 130, 0.45)';
  ctx.fillRect(0, SIZE * 0.48, SIZE, SIZE * 0.04);
  ctx.strokeStyle = 'rgba(120, 80, 20, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, SIZE * 0.48, SIZE, SIZE * 0.04);
}

function paintLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const targetW = SIZE * 0.66;
  const targetH = targetW * (img.height / img.width);
  const x = (SIZE - targetW) / 2;
  const y = SIZE * 0.16;
  ctx.drawImage(img, x, y, targetW, targetH);
}

function paintModelText(ctx: CanvasRenderingContext2D, model: string) {
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Model code — large, bold
  ctx.font = 'bold 78px "Arial", sans-serif';
  ctx.fillText(model.toUpperCase(), SIZE / 2, SIZE * 0.62);

  // Subtitle
  ctx.fillStyle = '#4b3a14';
  ctx.font = '20px "Arial", sans-serif';
  ctx.fillText('THERMAL TRANSFER PRINTER', SIZE / 2, SIZE * 0.72);

  // Handling marks (fragile/this side up arrows)
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 18px "Arial", sans-serif';
  ctx.fillText('▲   ▲   FRAGILE   ▲   ▲', SIZE / 2, SIZE * 0.88);
  ctx.restore();
}
