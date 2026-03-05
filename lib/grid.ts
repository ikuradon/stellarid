function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

export class Grid {
  width: number;
  height: number;
  table: number[];

  constructor(width: number, height: number, init: number = 0) {
    this.width = width;
    this.height = height;
    this.table = new Array(this.width * this.height).fill(init);
  }

  set(x: number, y: number, val: number): void {
    if (x < 0 || this.width <= x) {
      throw new RangeError(`x must be between 0 and ${this.width - 1}.`);
    }
    if (y < 0 || this.height <= y) {
      throw new RangeError(`y must be between 0 and ${this.height - 1}.`);
    }
    this.table[y * this.width + x] = val;
  }

  get(x: number, y: number): number {
    if (x < 0 || this.width <= x) {
      x = mod(x, this.width);
    }
    if (y < 0 || this.height <= y) {
      y = mod(y, this.height);
    }
    return this.table[y * this.width + x];
  }
}
