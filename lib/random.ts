export function createAlea(seed: string | number): () => number {
  let n = 0xefc8249d;
  const mash = (data: string): number => {
    for (let i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    return (n >>> 0) * 2.3283064365386963e-10;
  };

  let s0 = mash(' ');
  let s1 = mash(' ');
  let s2 = mash(' ');
  let c = 1;

  const seedStr = String(seed);
  s0 -= mash(seedStr);
  if (s0 < 0) s0 += 1;
  s1 -= mash(seedStr);
  if (s1 < 0) s1 += 1;
  s2 -= mash(seedStr);
  if (s2 < 0) s2 += 1;

  return () => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10;
    s0 = s1;
    s1 = s2;
    c = t | 0;
    s2 = t - c;
    return s2;
  };
}

export class Random {
  seed: string;
  private rng: () => number;

  constructor(seed?: string) {
    this.seed = seed ?? String(Math.random());
    this.rng = createAlea(this.seed);
  }

  random(): number {
    return this.rng();
  }

  randint(min: number, max: number): number {
    return Math.floor(this.random() * (max - min) + min);
  }

  uniform(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }
}
