# What is it?

The purpose of this package is to create ESM files from NPM packages.

It can be run directly via `npx vendeps` in a folder with a `package.json`, where it:
1. Reads the list of `dependencies` from `package.json`
2. Optionally reads per-dependency configuration from the `"vendeps"` key in `package.json`
3. Uses esbuild to convert each dependency to an ESM bundle and outputs it to `./dependencies/<packageName>.js`

The primary use case is for front-end web applications that want to use NPM packages without the hassle of setting up a build system.

## CLI

Read [./README.md] for further instructions about the CLI arguments and working logic.

## Architecture

- **`index.js`** — CLI entry point. Reads `package.json`, invokes the parser to get esbuild options, creates the target directory, and runs esbuild in parallel for each dependency.
- **`parser.js`** — Pure logic for config parsing and esbuild option generation. Exports `toEsbuildOptionsArr()` (public) and `_test` (for unit testing internals). Uses `jty` for type-checking utilities.

# Tests

This package is thoroughly tested using the built-in test framework of Node.js (`node --test`). Tests live in `parser.test.js` and cover the parser's internal functions (`configObj`, `normalizedConfig`, `toEsbuildOptions`) and the public `toEsbuildOptionsArr` function using a table-driven test pattern.