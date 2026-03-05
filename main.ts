import { Hono, type Context } from 'hono';
import { renderPlanet } from './lib/render.ts';
import { clamp } from './lib/utils.ts';

const app = new Hono();

function handlePlanet(c: Context, seed: string) {
  const scale = clamp(parseInt(c.req.query('scale') || '1') || 1, 1, 4);
  const wide = c.req.query('wide') !== undefined;
  const png = renderPlanet(seed, { scale, wide });
  return new Response(png as Uint8Array<ArrayBuffer>, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stellarid</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; margin: 0; padding: 2rem; text-align: center; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    p { color: #aaa; margin-bottom: 1.5rem; }
    .examples { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem; margin: 2rem 0; }
    .example { text-decoration: none; color: #ccc; }
    .example img { image-rendering: pixelated; display: block; margin-bottom: 0.5rem; border-radius: 4px; }
    code { background: #333; padding: 0.2em 0.5em; border-radius: 3px; font-size: 0.9rem; }
    .usage { max-width: 600px; margin: 2rem auto; text-align: left; }
    .usage h2 { font-size: 1.2rem; }
    .usage p { margin: 0.5rem 0; }
  </style>
</head>
<body>
  <h1>Stellarid</h1>
  <p>Procedural planet avatar generator. Same text always produces the same planet.</p>
  <div class="examples">
    <a class="example" href="/hello"><img src="/hello?scale=2" alt="hello" width="288" height="288"><code>hello</code></a>
    <a class="example" href="/world"><img src="/world?scale=2" alt="world" width="288" height="288"><code>world</code></a>
    <a class="example" href="/deno"><img src="/deno?scale=2" alt="deno" width="288" height="288"><code>deno</code></a>
  </div>
  <div class="usage">
    <h2>Usage</h2>
    <p><code>GET /{text}</code> - Generate a planet PNG from any text</p>
    <p><code>GET /{text}.png</code> - Same, with explicit extension</p>
    <p><code>GET /{text}?scale=2</code> - Scale up (1-4, default 1)</p>
    <p><code>GET /{text}?wide</code> - Wide format (192x144, original aspect)</p>
  </div>
  <p>Based on <a href="https://github.com/yurkth/astraea" style="color:#7aa2f7">Astraea</a></p>
</body>
</html>`;
  return c.html(html);
});

app.get('/:seed{.+\\.png}', (c) => {
  return handlePlanet(c, c.req.param('seed').replace(/\.png$/, ''));
});

app.get('/:seed', (c) => {
  return handlePlanet(c, c.req.param('seed'));
});

Deno.serve(app.fetch);
