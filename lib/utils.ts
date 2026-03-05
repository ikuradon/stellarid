import type { Color } from './color.ts';

export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function setPixel(
  pixels: Uint8Array, width: number, height: number,
  x: number, y: number, c: Color | null,
): void {
  x = Math.floor(x);
  y = Math.floor(y);
  if (c === null || x < 0 || width <= x || y < 0 || height <= y) return;
  const i = (y * width + x) * 4;
  pixels[i] = c.r;
  pixels[i + 1] = c.g;
  pixels[i + 2] = c.b;
  pixels[i + 3] = 255;
}

export function weightedChoiceIndex(
  length: number, weight: number[], value: number,
): number {
  const totalWeight = weight.reduce((sum, val) => sum + val, 0);
  let threshold = value * totalWeight;
  for (let i = 0; i < length; i++) {
    if (threshold <= weight[i]) return i;
    threshold -= weight[i];
  }
  return length - 1;
}

export function weightedChoice<T>(
  array: T[], weight: number[], value: number,
): T {
  return array[weightedChoiceIndex(array.length, weight, value)];
}
