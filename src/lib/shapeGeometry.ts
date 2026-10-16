import Matter from 'matter-js';
import decomp from 'poly-decomp';

// Register poly-decomp with window & Matter for concave decomposition
if (typeof window !== 'undefined') {
  (window as unknown as { decomp: typeof decomp }).decomp = decomp;
  Matter.Common.setDecomp(decomp);
}

export type ShapeType = 'hexagon' | 'circle' | 'square' | 'clover';

export interface ShapeDefinition {
  viewBox: string;
  path: string;
  sizeCompensation: number;
}

export const SHAPE_GEOMETRIES: Record<ShapeType, ShapeDefinition> = {
  hexagon: {
    viewBox: '0 0 321 357',
    path: 'M132.896 7.43243C149.932 -2.47747 170.922 -2.47748 187.958 7.43242L293.323 68.7223C310.359 78.6322 320.854 96.9465 320.854 116.766L320.854 239.346C320.854 259.166 310.359 277.48 293.323 287.39L187.958 348.68C170.922 358.59 149.932 358.59 132.896 348.68L27.5311 287.39C10.4948 277.48 0 259.166 0 239.346L0 116.766C0 96.9465 10.4948 78.6322 27.5311 68.7223L132.896 7.43243Z',
    sizeCompensation: 1.0,
  },
  circle: {
    viewBox: '0 0 322 322',
    path: 'M160.545 0C249.211 0 321.09 71.879 321.09 160.545C321.09 249.211 249.211 321.09 160.545 321.09C71.879 321.09 0 249.211 0 160.545C0 71.879 71.879 0 160.545 0Z',
    sizeCompensation: 1.0,
  },
  square: {
    viewBox: '0 0 321 321',
    path: 'M0 59.7623C0 26.7519 26.7519 0 59.7623 0H261.092C294.102 0 320.854 26.7519 320.854 59.7623V261.092C320.854 294.102 294.102 320.854 261.092 320.854H59.7623C26.7519 320.854 0 294.102 0 261.092V59.7623Z',
    sizeCompensation: 0.9,
  },
  clover: {
    viewBox: '0 0 326 326',
    path: 'M89.8477 0C119.388 1.12081e-05 145.597 14.1722 161.972 36.0494C162.482 36.7304 163.51 36.7304 164.02 36.0495C180.396 14.1731 206.605 0.00203366 236.145 0.00195312C285.764 0.00195312 325.989 39.988 325.989 89.3135C325.989 119.25 311.171 145.745 288.429 161.95C287.716 162.459 287.716 163.528 288.429 164.036C311.172 180.241 325.992 206.737 325.992 236.675C325.992 286 285.767 325.986 236.147 325.986C206.606 325.986 180.395 311.813 164.019 289.933C163.509 289.252 162.481 289.252 161.971 289.933C145.596 311.813 119.386 325.987 89.8447 325.987C40.2252 325.987 0 286.001 0 236.676C3.7764e-05 206.737 14.8197 180.24 37.5637 164.035C38.2774 163.527 38.2775 162.458 37.5638 161.949C14.8217 145.744 0.0039728 119.249 0.00390625 89.3115C0.00390625 39.986 40.2281 0 89.8477 0Z',
    sizeCompensation: 0.97,
  },
};

/**
 * Samples vertices along an SVG path matching Google Labs' algorithm
 */
export function samplePathToVertices(
  pathData: string,
  viewBox: string,
  targetSize: number,
  sampleStep = 30,
  minSamples = 14
): Matter.Vector[][] {
  const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
  const scale = targetSize / Math.max(vbWidth, vbHeight);

  // In browser environment, use SVG path measurement
  if (typeof document !== 'undefined') {
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathData);
    tempSvg.appendChild(pathEl);
    tempSvg.style.position = 'absolute';
    tempSvg.style.opacity = '0';
    tempSvg.style.pointerEvents = 'none';
    document.body.appendChild(tempSvg);

    try {
      const totalLength = pathEl.getTotalLength();
      const count = Math.max(minSamples, Math.floor(totalLength / sampleStep));
      const step = totalLength / count;
      const points: Matter.Vector[] = [];

      for (let i = 0; i < count; i++) {
        const pt = pathEl.getPointAtLength(i * step);
        points.push({ x: pt.x * scale, y: pt.y * scale });
      }
      return [points];
    } finally {
      document.body.removeChild(tempSvg);
    }
  }

  return [[]];
}
