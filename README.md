# vendeps

**One ESM file per dependency, ready for the browser.**
Vendor your dependencies for added reliability, security and simplicity.

`vendeps` reads the `dependencies` in your `package.json`, uses [esbuild](https://esbuild.github.io/) to bundle each one into a single ESM file, and drops the results into a `dependencies/` folder. Your browser code can then import them with plain `import` statements — no bundler, no build step, no CDN required.

```js
import { html, render } from './dependencies/lit-html.js'
import confetti from './dependencies/canvas-confetti.js'
```

## Why?

Modern browsers support ES modules natively, but most npm packages still ship CommonJS or split their code across dozens of files. Using a CDN solves the format problem but introduces new ones:

- **Security** — Every page load fetches code from a third-party server, opening the door to man-in-the-middle attacks or CDN compromises. Vendeps allows you to version-control your dependencies for audit.
- **Reliability** — Your app's uptime becomes coupled to the CDN's uptime. Vendeps decouples your app's uptime from any CDN.
- **Reproducibility** — CDN URLs can change, disappear, or serve different versions. Vendeps ensures that your app always uses the same version of a dependency.
- **Predictability** — You know exactly what code your users are running. Vendeps ensures that the exact same dependency you used during development is used in production.

`vendeps` takes a different approach: convert each dependency into a single, self-contained `.js` file that you **check into your repository**. Your app ships everything it needs — no external requests at runtime, no surprises.

## Quick Start

No installation required. In any project that has a `package.json` with `dependencies`:

```bash
npx vendeps
```

That's it. A `dependencies/` folder appears with one `.js` file per dependency. Point your `<script type="module">` at them and go.

### Even better: use Import Maps

Instead of rewriting your imports to point at `./dependencies/**/*.js`, you can use a [browser import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) so your source code keeps using bare specifiers — exactly like Node.js:

```html
<script type="importmap">
{
  "imports": {
    "lit-html": "./dependencies/lit-html.js",
    "canvas-confetti": "./dependencies/canvas-confetti.js"
  }
}
</script>
<script type="module" src="app.js"></script>
```

Now your application code works without any path changes:

```js
// app.js — same imports you'd write in Node
import { html, render } from 'lit-html'
import confetti from 'canvas-confetti'
```

The browser resolves the bare specifiers through the import map, so your code stays portable between Node.js and the browser with zero modifications.

## Installation

If you prefer to install it as a dev dependency:

```bash
npm install --save-dev vendeps
```

### Automate with `postinstall`

To ensure the `dependencies/` folder is always up to date after `npm install` or `npm ci`, add a `postinstall` script to your `package.json`:

```json
{
  "scripts": {
    "postinstall": "vendeps --minify"
  }
}
```

Now every `npm ci` on your CI server or a fresh clone will automatically populate the `dependencies/` folder with minified bundles — no extra step to remember.

> ⚠️ **Dependency drift** — The vendored bundles are snapshots of whatever versions are installed at build time. If you update a dependency version in `package.json` (or run `npm update`), remember to re-run `npx vendeps` (or trigger a fresh `npm ci`) so the bundles stay in sync. Checking in the `dependencies/` folder helps catch drift — any version bump will show up as a diff in your commit.

## CLI Options

```
npx vendeps [options]
```

| Option | Description |
|---|---|
| `--minify` | Minify the output bundles. Also activates automatically when `NODE_ENV=production`. |
| `--target <dir>` | Output to `<dir>/` instead of the default `dependencies/`. The directory is created if it doesn't exist. |
| `--help` | Show usage information and exit. |

### Examples

```bash
# Bundle everything into dependencies/
npx vendeps

# Minified production bundles
npx vendeps --minify

# Output to a custom folder
npx vendeps --target vendor

# Combine options
npx vendeps --minify --target lib/vendor
```

## Per-Dependency Configuration

By default, `vendeps` re-exports everything from each dependency:

```js
// generated: export * from 'some-package'
```

You can customize this behavior per-dependency via the `"vendeps"` key in your `package.json`:

```json
{
  "dependencies": {
    "lit-html": "^3.0.0",
    "chart.js": "^4.0.0",
    "some-internal-tool": "^1.0.0",
    "@huggingface/transformers": "^3.0.0"
  },
  "vendeps": {
    "some-internal-tool": null,
    "chart.js": {
      "export": "{ Chart }",
      "define": ["PRODUCTION"]
    }
  }
}
```

### Config Options

| Config value | Effect |
|---|---|
| *(not set)* | Default — `export * from '<packageName>'` |
| `null` or `false` | **Skip** this dependency entirely. |
| `"path/to/file.js"` | Use a custom import source instead of the package name. |
| `{ ... }` | Full configuration object (see below). |

### Full Config Object

| Key | Type | Default | Description |
|---|---|---|---|
| `from` | `string` | package name | The import source path. |
| `export` | `string` | `"*"` | The export style, e.g. `"*"`, `"{ Chart }"`, `"default"`. |
| `define` | `object` or `string[]` | `{}` | [esbuild `define`](https://esbuild.github.io/api/#define) replacements. When an array of strings, each is defined as `"true"`. |

### Scoped Packages

Scoped packages like `@huggingface/transformers` are output with their scope directory preserved:

```
dependencies/@huggingface/transformers.js
```

Import them the same way:

```js
import { pipeline } from './dependencies/@huggingface/transformers.js'
```

## Recommended Workflow

1. **Add your npm dependencies** as usual with `npm install`.
2. **Run `npx vendeps`** (or let `postinstall` handle it).
3. **Check in the `dependencies/` folder** to version control.
4. **Import from `dependencies/`** in your browser JS files.

```
my-project/
├── package.json
├── dependencies/       ← checked into git
│   ├── lit-html.js
│   ├── canvas-confetti.js
│   └── @huggingface/
│       └── transformers.js
├── index.html
└── app.js              ← import from ./dependencies/
```

By committing the `dependencies/` folder, you get:

- **Self-contained deployments** — no install step needed on the server, no external fetches at runtime.
- **No CDN dependency** — your app works even if every CDN on the internet goes down.
- **Auditability** — the exact code your users receive is visible in your repo.
- **Reproducibility** — every clone, every checkout, every deploy uses the exact same dependency code.

## Limitations

> ⚠️ **CSS-only packages** — `vendeps` bundles JavaScript only. If a dependency ships exclusively CSS (e.g. `normalize.css`), it will not be handled. You will need to copy those assets manually or use a separate tool.

## License

[MIT](LICENSE)
