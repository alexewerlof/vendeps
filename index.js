#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import * as esbuild from 'esbuild'
import { toEslintOptionsArr } from './parser.js'

const CONFIG_KEY = 'toesm'
const DEFAULT_TARGET_DIR = 'dependencies'

function getTarget(argv) {
    const i = argv.indexOf('--target')
    return i !== -1 && argv[i + 1] ? argv[i + 1] : DEFAULT_TARGET_DIR
}

const targetDir = getTarget(process.argv)

if (process.argv.includes('--help')) {
    console.log([
        'toesm — Convert npm dependencies to ESM bundles ready for the browser environment.',
        '',
        'Usage: npx toesm [options]',
        '',
        'Options:',
        `  --target <dir>  Output directory (default: "${DEFAULT_TARGET_DIR}")`,
        '  --minify        Minify the output bundles (default: false, also activates when NODE_ENV=production)',
        '  --help          Show this help message',
        '',
        'Reads "dependencies" from package.json and bundles each one into <target>/<name>.js.',
        'Per-dependency config can be set via the "toesm" key in package.json.',
        '',
        'Scoped packages (e.g. @huggingface/transformers) are output as <target>/@scope/<name>.js.',
    ].join('\n'))
    process.exit(0)
}

async function getDependenciesAndConfig(path) {
    const { dependencies, [CONFIG_KEY]: toesmConfig } = JSON.parse(await readFile(path, 'utf-8'))
    return { dependencies, toesmConfig }
}

async function readConfig(resolveDir, minify) {
    const { dependencies, toesmConfig } = await getDependenciesAndConfig(join(resolveDir, 'package.json'))
    return toEslintOptionsArr(Object.keys(dependencies), toesmConfig, resolveDir, minify, targetDir).filter(Boolean)
}

async function main() {
    const minify = process.argv.includes('--minify') || process.env.NODE_ENV === 'production'

    console.time('Read config')
    const optionsArr = await readConfig(process.cwd(), minify)
    console.timeEnd('Read config')
    if (optionsArr.length === 0) {
        console.info('🫙 No dependencies to process. Exiting.')
        process.exit(0)
    }

    await mkdir(targetDir, { recursive: true });
    console.info(`🏃 Updating ${targetDir} for ${optionsArr.length} dependency(ies). Minify: ${minify}`)

    console.time('Build')
    await Promise.all(optionsArr.map((options) => esbuild.build(options)))
    console.timeEnd('Build')
    console.log(`🎉 Updated ${targetDir} dir.`)
}

main().catch((err) => {
    console.error(`❌ ${err}`)
    process.exitCode = 1
})
