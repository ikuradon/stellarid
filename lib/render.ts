import { encode } from 'fast-png';
import PoissonDiskSampling from 'poisson-disk-sampling';
import type { Color, PlanetPalette } from './color.ts';
import { ColorMode, createPalette, NoiseMode, weightedChoice } from './color.ts';
import { Planet, Satellite } from './planet.ts';
import { Random } from './random.ts';
import { nouns } from './words.ts';

const WIDTH = 192;
const HEIGHT = 144;

interface SceneData {
  palette: PlanetPalette;
  planets: Planet[];
  satellites: Satellite[];
  stars: [number, number, Color | null][];
}

function generate(rng: Random): SceneData {
  const size = Math.max(rng.randint(32, 64), rng.randint(32, 64));

  const colorMode = weightedChoice(
    [
      ColorMode.Analogous, ColorMode.Complementary, ColorMode.SplitComplementary,
      ColorMode.Triad, ColorMode.Cavity, ColorMode.Earth,
    ],
    [15, 10, 6, 4, 1, 6],
    rng.random(),
  );

  const palette = createPalette(rng, colorMode);
  const isCavity = colorMode === ColorMode.Cavity;

  const noiseDist = [
    [3, 1, 2, 1, 2, 2],
    [3, 0, 2, 0, 0, 2],
    [3, 0, 2, 0, 0, 0],
  ];
  const noiseMode = weightedChoice(
    [
      NoiseMode.Simplex, NoiseMode.Ridged, NoiseMode.DomainWarping,
      NoiseMode.VStripe, NoiseMode.HStripe, NoiseMode.Gradation,
    ],
    noiseDist[Math.floor(colorMode / 2)],
    rng.random(),
  );
  const isGradation = noiseMode === NoiseMode.Gradation;

  const planets: Planet[] = [];
  planets.push(new Planet(rng, {
    diameter: size,
    noiseMode: noiseMode,
    palette: palette.planet,
    weight: isGradation
      ? [rng.uniform(1, 4), rng.uniform(1, 4), rng.uniform(1, 4)]
      : undefined,
    backColor: isCavity ? palette.cloud[0] : undefined,
    lapTime: rng.uniform(3, 5),
    canvasWidth: WIDTH,
    canvasHeight: HEIGHT,
  }));

  if (!isCavity && weightedChoice([true, false], [4, 1], rng.random())) {
    planets.push(new Planet(rng, {
      diameter: size + 4,
      noiseMode: weightedChoice(
        [NoiseMode.Simplex, NoiseMode.DomainWarping],
        [3, 1],
        rng.random(),
      ),
      palette: [palette.cloud[0], null, palette.cloud[0]],
      weight: [2, 3, 3],
      backColor: palette.cloud[1],
      lapTime: planets[0].lapTime * rng.uniform(1.5, 2),
      canvasWidth: WIDTH,
      canvasHeight: HEIGHT,
    }));
  }

  const satellites: Satellite[] = [];
  const hasRing = weightedChoice([true, false], [1, 5], rng.random());
  const satCount = hasRing
    ? rng.uniform(2, 4) * size
    : rng.randint(1, 6);

  for (let i = satCount; i > 0; i--) {
    satellites.push(new Satellite({
      diameter: rng.randint(2, size / 8),
      color: weightedChoice(palette.satellite, [1, 1], rng.random()),
      speed: rng.uniform(0.5, 1.5),
      a: rng.randint(size * 3 / 4, size),
      b: rng.randint(size / 8, size / 4),
      initAngle: rng.randint(0, 360),
      rotate: hasRing ? 0 : rng.randint(-90, 90),
      canvasWidth: WIDTH,
      canvasHeight: HEIGHT,
    }));
  }

  const pdsObj = new PoissonDiskSampling({
    shape: [WIDTH, HEIGHT],
    minDistance: 25,
    maxDistance: 50,
    tries: 20,
  }, rng.random.bind(rng));

  const stars: [number, number, Color | null][] = pdsObj.fill().map(
    (val: number[]) => [
      val[0], val[1],
      weightedChoice<Color | null>(
        [...palette.star, null],
        [3, 6, 2],
        rng.random(),
      ),
    ] as [number, number, Color | null],
  );

  return { palette, planets, satellites, stars };
}

function setPixel(
  pixels: Uint8Array, x: number, y: number, c: Color | null,
): void {
  x = Math.floor(x);
  y = Math.floor(y);
  if (c === null || x < 0 || WIDTH <= x || y < 0 || HEIGHT <= y) return;
  const i = (y * WIDTH + x) * 4;
  pixels[i] = c.r;
  pixels[i + 1] = c.g;
  pixels[i + 2] = c.b;
  pixels[i + 3] = 255;
}

export function renderPlanet(seed: string, scale: number = 1): Uint8Array {
  const normalizedSeed = seed
    .replace(/ /g, '_')
    .replace(/[^\w]/g, '?')
    .toLowerCase();
  const seedUpper = (normalizedSeed || randomWord()).toUpperCase();

  const rng = new Random(seedUpper);
  const { palette, planets, satellites, stars } = generate(rng);
  const frameCount = 0;

  // Create pixel buffer
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);

  // Fill background
  const bg = palette.background;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    pixels[i * 4] = bg.r;
    pixels[i * 4 + 1] = bg.g;
    pixels[i * 4 + 2] = bg.b;
    pixels[i * 4 + 3] = 255;
  }

  // Draw stars
  for (const star of stars) {
    setPixel(pixels, star[0], star[1], star[2]);
  }

  // Draw back layers
  for (let i = satellites.length - 1; i >= 0; i--) {
    satellites[i].draw(pixels, WIDTH, HEIGHT, true, frameCount);
  }
  for (let i = planets.length - 1; i >= 0; i--) {
    planets[i].draw(pixels, WIDTH, HEIGHT, true, frameCount);
  }

  // Draw front layers
  for (let i = 0; i < planets.length; i++) {
    planets[i].draw(pixels, WIDTH, HEIGHT, false, frameCount);
  }
  for (let i = 0; i < satellites.length; i++) {
    satellites[i].draw(pixels, WIDTH, HEIGHT, false, frameCount);
  }

  // Scale if needed
  if (scale > 1) {
    const newW = WIDTH * scale;
    const newH = HEIGHT * scale;
    const scaled = new Uint8Array(newW * newH * 4);
    for (let y = 0; y < newH; y++) {
      const srcY = Math.floor(y / scale);
      for (let x = 0; x < newW; x++) {
        const srcX = Math.floor(x / scale);
        const si = (srcY * WIDTH + srcX) * 4;
        const di = (y * newW + x) * 4;
        scaled[di] = pixels[si];
        scaled[di + 1] = pixels[si + 1];
        scaled[di + 2] = pixels[si + 2];
        scaled[di + 3] = pixels[si + 3];
      }
    }
    return encode({
      width: newW,
      height: newH,
      data: scaled,
      channels: 4,
      depth: 8,
    });
  }

  return encode({
    width: WIDTH,
    height: HEIGHT,
    data: pixels,
    channels: 4,
    depth: 8,
  });
}

function randomWord(): string {
  return nouns[Math.floor(Math.random() * nouns.length)];
}
