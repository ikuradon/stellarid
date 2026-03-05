# Stellarid

Procedural planet avatar generator — like [RoboHash](https://robohash.org), but with planets.

Given any text, Stellarid deterministically generates a unique pixel-art planet image. The same input always produces the same planet.

## Usage

```
GET /{text}          → PNG image (144x144 square)
GET /{text}.png      → same
GET /{text}?scale=2  → scaled up (1–4, default 1)
GET /{text}?wide     → wide format (192x144, original aspect)
```

Parameters can be combined: `/{text}?wide&scale=3`

### Examples

| `/hello` | `/world` | `/deno` |
|:---:|:---:|:---:|
| ![hello](https://stellarid.ikuradon.deno.net/hello?scale=2) | ![world](https://stellarid.ikuradon.deno.net/world?scale=2) | ![deno](https://stellarid.ikuradon.deno.net/deno?scale=2) |

## Running locally

Requires [Deno](https://deno.land/).

```bash
# Development (with file watching)
deno task dev

# Production
deno task start
```

The server starts on `http://localhost:8000` by default.

## Deploy

### Deno Deploy (GitHub integration)

1. Push to GitHub
2. Connect the repository at [dash.deno.com](https://dash.deno.com)
3. Set entrypoint to `main.ts`

### Deno Deploy (CLI)

```bash
deno install -gArf jsr:@deno/deployctl
deployctl deploy --prod --project=stellarid --entrypoint=main.ts
```

## How it works

1. The input text is normalized and used as a seed for a deterministic PRNG ([Alea](https://github.com/coverslide/node-alea))
2. Planet properties (size, color palette, noise pattern, satellites, stars) are procedurally generated from the seed
3. A 3D simplex noise field is projected onto a pixel-art sphere to create surface textures
4. The scene is rendered to an RGBA pixel buffer and encoded as PNG
5. Results are cached in-memory (LRU, 256 entries) for repeated requests

## Tech stack

- [Deno](https://deno.land/) — runtime
- [Hono](https://hono.dev/) — web framework
- [simplex-noise](https://github.com/jwagner/simplex-noise.js) — noise generation
- [fast-png](https://github.com/image-js/fast-png) — PNG encoding
- [poisson-disk-sampling](https://github.com/kchapelier/poisson-disk-sampling) — star placement

## Credits

The planet generation algorithm is ported from **[Astraea](https://github.com/yurkth/astraea)** by [yurkth](https://github.com/yurkth) (MIT License), a browser-based procedural planet generator inspired by [Planetarium](https://managore.itch.io/planetarium) by Managore.

The word list for random planet names is derived from the [Corpora](https://github.com/dariusk/corpora) project by Darius Kazemi.

## License

[MIT](LICENSE)
