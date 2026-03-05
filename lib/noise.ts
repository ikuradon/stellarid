import { createNoise3D, type NoiseFunction3D } from 'simplex-noise';
import { createAlea } from './random.ts';

export class NoiseGenerator {
  private noise3D: NoiseFunction3D;

  constructor(seed: number) {
    const rng = createAlea(String(seed));
    this.noise3D = createNoise3D(rng);
  }

  private _noise(x: number, y: number, z: number, scale: number = 1): number {
    return this.noise3D(x * scale, y * scale, z * scale) * 0.5 + 0.5;
  }

  private _ridged(x: number, y: number, z: number, scale: number = 1): number {
    return Math.abs(this.noise3D(x * scale, y * scale, z * scale));
  }

  private _fbm(
    func: (x: number, y: number, z: number, scale: number) => number,
    x: number, y: number, z: number, octaves: number = 6,
  ): number {
    let result = 0;
    let denom = 0;
    for (let o = 0; o < octaves; o++) {
      const ampl = Math.pow(0.5, o);
      result += ampl * func(x, y, z, Math.pow(2, o));
      denom += ampl;
    }
    return result / denom;
  }

  simplexFbm(x: number, y: number, z: number, octaves: number = 6): number {
    return this._fbm(this._noise.bind(this), x, y, z, octaves);
  }

  ridgedFbm(x: number, y: number, z: number, octaves: number = 6): number {
    return 1 - this._fbm(this._ridged.bind(this), x, y, z, octaves);
  }

  domainWarping(x: number, y: number, z: number, octaves: number = 6): number {
    const n = this._noise(x, y, z);
    return this.simplexFbm(x + n, y + n, z + n, octaves);
  }
}
