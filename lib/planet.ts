import type { Color } from './color.ts';
import { NoiseMode } from './color.ts';
import { Grid } from './grid.ts';
import { NoiseGenerator } from './noise.ts';
import type { Random } from './random.ts';
import { setPixel, weightedChoiceIndex } from './utils.ts';

const PI2 = Math.PI * 2;

class PixelSphere {
  diameter: number;
  sphereWidth: number[];

  constructor(diameter: number) {
    this.diameter = diameter;
    this.sphereWidth = [];
    this._setSphereWidth();
  }

  private _setSphereWidth(): void {
    const parity = 1 - this.diameter % 2;
    let r = Math.floor(this.diameter / 2) - parity;
    let y = -r;
    let x = 0;
    let d = 2 - 2 * r;
    const i = r;

    do {
      r = d;
      if (r > y || d > x) {
        const w = x * 2 + 1 + parity;
        this.sphereWidth[y + i] = w;
        this.sphereWidth[this.diameter - y - i - 1] = w;
        d += ++y * 2 + 1;
      }
      if (r <= x) {
        d += ++x * 2 + 1;
      }
    } while (y <= 0);
  }
}

export interface PlanetOptions {
  diameter: number;
  noiseMode?: number;
  palette: (Color | null)[];
  weight?: number[];
  backColor?: Color | null;
  lapTime?: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class Planet extends PixelSphere {
  noiseMode: number;
  palette: (Color | null)[];
  weight: number[] | undefined;
  lapTime: number;
  backColor: Color | null;
  offset: [number, number];
  grid: Grid;
  speed: number;

  constructor(rng: Random, options: PlanetOptions) {
    super(options.diameter);
    this.noiseMode = options.noiseMode ?? NoiseMode.Simplex;
    this.palette = options.palette;
    this.weight = options.weight;
    this.lapTime = options.lapTime ?? 1;
    this.backColor = options.backColor ?? null;
    this.offset = [options.canvasWidth / 2, options.canvasHeight / 2];

    const noise = new NoiseGenerator(rng.random());
    this.grid = new Grid(this.diameter * 2, this.diameter, 0);
    this._setSphereNoise(noise, rng);
    this.speed = this.diameter / 30 / this.lapTime;
  }

  private _setSphereNoise(noise: NoiseGenerator, rng: Random): void {
    // Precompute trig values to avoid redundant Math.sin/cos calls
    const cosPhis = new Float64Array(this.grid.width);
    const sinPhis = new Float64Array(this.grid.width);
    for (let x = 0; x < this.grid.width; x++) {
      const phi = (x / this.grid.width) * PI2;
      cosPhis[x] = Math.cos(phi);
      sinPhis[x] = Math.sin(phi);
    }
    const sinThetas = new Float64Array(this.grid.height);
    const cosThetas = new Float64Array(this.grid.height);
    for (let y = 0; y < this.grid.height; y++) {
      const theta = (y / this.grid.height) * Math.PI;
      sinThetas[y] = Math.sin(theta);
      cosThetas[y] = Math.cos(theta);
    }

    for (let x = 0; x < this.grid.width; x++) {
      for (let y = 0; y < this.grid.height; y++) {
        let val: number;
        let weight: number[];
        const nx = sinThetas[y] * cosPhis[x] + 1;
        const ny = sinThetas[y] * sinPhis[x] + 1;
        const nz = cosThetas[y] + 1;
        let off: number;

        switch (this.noiseMode) {
          case NoiseMode.Simplex:
            val = noise.simplexFbm(nx, ny, nz);
            weight = [8, 6, 11];
            break;
          case NoiseMode.Ridged:
            val = noise.ridgedFbm(nx, ny, nz);
            weight = [2, 1, 1];
            break;
          case NoiseMode.DomainWarping:
            val = noise.domainWarping(nx, ny, nz);
            weight = [8, 6, 11];
            break;
          case NoiseMode.VStripe:
            off = noise.simplexFbm(nx, ny, nz);
            val = (Math.cos((4 * x / this.grid.width + off) * this.diameter / 32 * PI2) + 1) * 0.5;
            weight = [2, 3, 2];
            break;
          case NoiseMode.HStripe:
            off = noise.simplexFbm(nx, ny, nz);
            val = (Math.cos((4 * y / this.grid.height + off) * this.diameter / 32 * PI2) + 1) * 0.5;
            weight = [1, 2, 1];
            break;
          case NoiseMode.Gradation:
            off = noise.simplexFbm(nx, ny, nz);
            val = (y + off * 20) / (this.grid.height + 20);
            weight = [2, 1, 2];
            break;
          default:
            val = noise.simplexFbm(nx, ny, nz);
            weight = [8, 6, 11];
        }

        this.grid.set(
          x, y,
          weightedChoiceIndex(this.palette.length, this.weight ?? weight, val),
        );
      }
    }
  }

  draw(
    pixels: Uint8Array, canvasWidth: number, canvasHeight: number,
    isBack: boolean, frameCount: number,
  ): void {
    if (isBack && this.backColor === null) return;
    for (let y = 0; y < this.diameter; y++) {
      const sw = this.sphereWidth[y];
      if (sw === undefined) continue;
      for (let x = 0; x < sw; x++) {
        const gx = Math.floor(
          (x / sw + (isBack ? 1 : 0)) * this.diameter - frameCount * this.speed,
        );
        let c = this.palette[this.grid.get(gx, y)];
        if (isBack && c !== null) {
          c = this.backColor;
        }
        setPixel(
          pixels, canvasWidth, canvasHeight,
          (isBack ? -1 : 1) * (x - sw / 2 + 0.5) + this.offset[0],
          y + this.offset[1] - this.diameter / 2,
          c,
        );
      }
    }
  }
}

export interface SatelliteOptions {
  diameter: number;
  color: Color;
  speed?: number;
  a?: number;
  b?: number;
  initAngle?: number;
  rotate?: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class Satellite extends PixelSphere {
  color: Color;
  speed: number;
  a: number;
  b: number;
  initAngle: number;
  s: number;
  c: number;
  offset: [number, number];

  constructor(options: SatelliteOptions) {
    super(options.diameter);
    this.color = options.color;
    this.speed = options.speed ?? 1;
    this.a = options.a ?? options.canvasWidth / 3;
    this.b = options.b ?? 0;
    this.initAngle = options.initAngle ?? 0;
    const rotate = ((options.rotate ?? 0) % 360) * Math.PI / 180;
    this.offset = [options.canvasWidth / 2, options.canvasHeight / 2];
    this.s = Math.sin(rotate);
    this.c = Math.cos(rotate);
  }

  draw(
    pixels: Uint8Array, canvasWidth: number, canvasHeight: number,
    isBack: boolean, frameCount: number,
  ): void {
    const rad = ((-frameCount - this.initAngle) * this.speed % 360) * Math.PI / 180;
    // XOR: isBack ^ (|rad| < PI)
    const inFront = Math.abs(rad) < Math.PI;
    if (isBack !== inFront) return;
    const ex = this.a * Math.cos(rad);
    const ey = this.b * Math.sin(rad);
    const px = ex * this.c - ey * this.s;
    const py = ex * this.s + ey * this.c;
    for (let y = 0; y < this.diameter; y++) {
      const sw = this.sphereWidth[y];
      if (sw === undefined) continue;
      for (let x = 0; x < sw; x++) {
        setPixel(
          pixels, canvasWidth, canvasHeight,
          px + x + this.offset[0] - sw / 2 + 0.5,
          py + y + this.offset[1] - this.diameter / 2,
          this.color,
        );
      }
    }
  }
}
