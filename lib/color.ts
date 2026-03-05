import { Random } from './random.ts';

export interface Color {
  r: number;
  g: number;
  b: number;
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export function hsb(h: number, s: number, b: number): Color {
  h = mod(h, 360);
  s = Math.max(0, Math.min(100, s)) / 100;
  b = Math.max(0, Math.min(100, b)) / 100;

  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;

  let r = 0, g = 0, bl = 0;
  if (h < 60)       { r = c; g = x; bl = 0; }
  else if (h < 120) { r = x; g = c; bl = 0; }
  else if (h < 180) { r = 0; g = c; bl = x; }
  else if (h < 240) { r = 0; g = x; bl = c; }
  else if (h < 300) { r = x; g = 0; bl = c; }
  else              { r = c; g = 0; bl = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((bl + m) * 255),
  };
}

export const NoiseMode = {
  Simplex: 0,
  Ridged: 1,
  DomainWarping: 2,
  VStripe: 3,
  HStripe: 4,
  Gradation: 5,
} as const;

export const ColorMode = {
  Analogous: 0,
  Complementary: 1,
  SplitComplementary: 2,
  Triad: 3,
  Cavity: 4,
  Earth: 5,
} as const;

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

interface ColorProp {
  h: { offset: number; range: number };
  s: { offset: number; range: number };
  b: { offset: number; range: number };
}

export interface PlanetPalette {
  background: Color;
  planet: (Color | null)[];
  cloud: Color[];
  satellite: Color[];
  star: Color[];
}

function shiftHue(hue: number, dist: number = 15): number {
  hue = mod(hue, 360);
  if (240 - dist <= hue && hue <= 240 + dist) return 240;
  if (60 < hue && hue < 225) return hue + dist;
  return mod(hue - dist, 360);
}

function parseColor(rng: Random, prop: ColorProp): Color {
  const h = mod(
    rng.randint(-prop.h.range / 2, prop.h.range / 2) + prop.h.offset, 360,
  );
  const s = rng.randint(-prop.s.range / 2, prop.s.range / 2) + prop.s.offset;
  const b = rng.randint(-prop.b.range / 2, prop.b.range / 2) + prop.b.offset;
  return hsb(h, s, b);
}

export function createPalette(rng: Random, mode: number): PlanetPalette {
  const h = rng.randint(0, 360);

  const background = parseColor(rng, {
    h: { offset: h + 180, range: 20 },
    s: { offset: 15, range: 0 },
    b: { offset: 15, range: 0 },
  });

  let cloud = [
    { h: { offset: h, range: 20 }, s: { offset: 10, range: 10 }, b: { offset: 100, range: 0 } },
    { h: { offset: h, range: 20 }, s: { offset: 10, range: 10 }, b: { offset: 80, range: 0 } },
  ].map((p) => parseColor(rng, p));

  const satellite = [
    { h: { offset: h + 45, range: 20 }, s: { offset: 30, range: 10 }, b: { offset: 90, range: 10 } },
    { h: { offset: shiftHue(h + 45), range: 20 }, s: { offset: 50, range: 10 }, b: { offset: 70, range: 10 } },
  ].map((p) => parseColor(rng, p));

  const star = [
    { h: { offset: h + 180, range: 20 }, s: { offset: 10, range: 0 }, b: { offset: 100, range: 0 } },
    { h: { offset: h + 180, range: 20 }, s: { offset: 20, range: 0 }, b: { offset: 40, range: 0 } },
  ].map((p) => parseColor(rng, p));

  let planet: (Color | null)[];
  switch (mode) {
    case ColorMode.Analogous:
      planet = [
        { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: shiftHue(h, 15), range: 10 }, s: { offset: 65, range: 10 }, b: { offset: 75, range: 10 } },
        { h: { offset: shiftHue(h, 30), range: 10 }, s: { offset: 70, range: 10 }, b: { offset: 60, range: 10 } },
      ].map((p) => parseColor(rng, p));
      break;
    case ColorMode.Complementary:
      planet = [
        { h: { offset: shiftHue(h, 15), range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 75, range: 10 } },
        { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: h + 180, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
      ].map((p) => parseColor(rng, p));
      break;
    case ColorMode.SplitComplementary:
      planet = [
        { h: { offset: h + 160, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: h + 200, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
      ].map((p) => parseColor(rng, p));
      break;
    case ColorMode.Triad:
      planet = [
        { h: { offset: h + 120, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: h + 240, range: 10 }, s: { offset: 40, range: 10 }, b: { offset: 90, range: 10 } },
      ].map((p) => parseColor(rng, p));
      break;
    case ColorMode.Cavity:
      planet = [
        null,
        parseColor(rng, { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } }),
        null,
      ];
      break;
    case ColorMode.Earth:
      planet = [
        { h: { offset: 210, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 85, range: 10 } },
        { h: { offset: 200, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 85, range: 10 } },
        { h: { offset: 135, range: 10 }, s: { offset: 70, range: 10 }, b: { offset: 90, range: 10 } },
      ].map((p) => parseColor(rng, p));
      cloud = [
        { h: { offset: h, range: 0 }, s: { offset: 2, range: 4 }, b: { offset: 98, range: 4 } },
        { h: { offset: 0, range: 0 }, s: { offset: 0, range: 0 }, b: { offset: 80, range: 0 } },
      ].map((p) => parseColor(rng, p));
      break;
    default:
      planet = [
        { h: { offset: h, range: 10 }, s: { offset: 60, range: 10 }, b: { offset: 90, range: 10 } },
        { h: { offset: shiftHue(h, 15), range: 10 }, s: { offset: 65, range: 10 }, b: { offset: 75, range: 10 } },
        { h: { offset: shiftHue(h, 30), range: 10 }, s: { offset: 70, range: 10 }, b: { offset: 60, range: 10 } },
      ].map((p) => parseColor(rng, p));
  }

  return { background, planet, cloud, satellite, star };
}
