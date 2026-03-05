import { encode } from 'fast-png';
import PoissonDiskSampling from 'poisson-disk-sampling';
import type { Color, PlanetPalette } from './color.ts';
import { ColorMode, createPalette, NoiseMode } from './color.ts';
import { Planet, Satellite } from './planet.ts';
import { Random } from './random.ts';
import { setPixel, weightedChoice } from './utils.ts';
import { nouns } from './words.ts';

const WIDTH = 192;
const HEIGHT = 144;
const MAX_CACHE_SIZE = 256;

const cache = new Map<string, Uint8Array>();

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

export function renderPlanet(seed: string, scale: number = 1): Uint8Array {
  const normalizedSeed = (seed || randomWord())
    .replace(/ /g, '_')
    .replace(/[^\w]/g, '?')
    .toUpperCase();

  const cacheKey = `${normalizedSeed}:${scale}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const rng = new Random(normalizedSeed);
  const { palette, planets, satellites, stars } = generate(rng);
  const frameCount = 0;

  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);

  // Fill background using Uint32Array for efficiency
  const bg = palette.background;
  const bgWord = bg.r | (bg.g << 8) | (bg.b << 16) | (255 << 24);
  new Uint32Array(pixels.buffer).fill(bgWord);

  for (const star of stars) {
    setPixel(pixels, WIDTH, HEIGHT, star[0], star[1], star[2]);
  }

  for (let i = satellites.length - 1; i >= 0; i--) {
    satellites[i].draw(pixels, WIDTH, HEIGHT, true, frameCount);
  }
  for (let i = planets.length - 1; i >= 0; i--) {
    planets[i].draw(pixels, WIDTH, HEIGHT, true, frameCount);
  }
  for (let i = 0; i < planets.length; i++) {
    planets[i].draw(pixels, WIDTH, HEIGHT, false, frameCount);
  }
  for (let i = 0; i < satellites.length; i++) {
    satellites[i].draw(pixels, WIDTH, HEIGHT, false, frameCount);
  }

  let outWidth = WIDTH;
  let outHeight = HEIGHT;
  let outPixels = pixels;

  if (scale > 1) {
    outWidth = WIDTH * scale;
    outHeight = HEIGHT * scale;
    outPixels = new Uint8Array(outWidth * outHeight * 4);
    for (let y = 0; y < outHeight; y++) {
      const srcY = Math.floor(y / scale);
      for (let x = 0; x < outWidth; x++) {
        const srcX = Math.floor(x / scale);
        const si = (srcY * WIDTH + srcX) * 4;
        const di = (y * outWidth + x) * 4;
        outPixels[di] = pixels[si];
        outPixels[di + 1] = pixels[si + 1];
        outPixels[di + 2] = pixels[si + 2];
        outPixels[di + 3] = pixels[si + 3];
      }
    }
  }

  const png = encode({
    width: outWidth,
    height: outHeight,
    data: outPixels,
    channels: 4,
    depth: 8,
  });

  // LRU-like eviction: remove oldest entry when cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(cacheKey, png);

  return png;
}

function randomWord(): string {
  return nouns[Math.floor(Math.random() * nouns.length)];
}
