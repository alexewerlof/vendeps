# What is it?

The purpose of this package is to create ESM files from NPM packages.

It can be run directly via `npx toesm` in a folder with a `package.json`, where it:
1. Reads the list of `dependencies` from `package.json`
2. Optionally reads per-dependency configuration from the `"toesm"` key in `package.json`
3. Uses esbuild to convert each dependency to an ESM bundle and outputs it to `./dependencies/<packageName>.js`

The primary use case is for front-end web applications that want to use NPM packages without the hassle of setting up a build system.

## CLI

- `npx toesm` — Run the tool to bundle all dependencies.
- `npx toesm --minify` — Minify the output bundles. Also activates when `NODE_ENV=production`.
- `npx toesm --target <dir>` — Output bundles to `<dir>/` instead of the default `dependencies/` (the directory will be created if it doesn't exist).
- `npx toesm --help` — Show usage information and exit.

## Architecture

- **`index.js`** — CLI entry point. Reads `package.json`, invokes the parser to get esbuild options, creates the target directory, and runs esbuild in parallel for each dependency.
- **`parser.js`** — Pure logic for config parsing and esbuild option generation. Exports `toEslintOptionsArr()` (public) and `_test` (for unit testing internals). Uses `jty` for type-checking utilities.

## Per-dependency configuration

Each dependency can be customized via the `"toesm"` key in `package.json`. If no config is provided, the default is `export * from '<packageName>'`.

- **Skip a dependency**: Set it to `null` or `false`.
- **Custom source path**: Set it to a string, e.g. `"my-dep": "path/to/file.js"`.
- **Full config object**: `{ "from": "...", "export": "...", "define": { ... } }`
  - `from` — The import source (defaults to the package name).
  - `export` — The export style, e.g. `"*"`, `"default"` (defaults to `"*"`).
  - `define` — An object of esbuild `define` replacements, or an array of strings (each set to `"true"`).

# Tests

This package is thoroughly tested using the built-in test framework of Node.js (`node --test`). Tests live in `parser.test.js` and cover the parser's internal functions (`configObj`, `normalizedConfig`, `toEslintOptions`) and the public `toEslintOptionsArr` function using a table-driven test pattern.