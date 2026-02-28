#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'
import * as esbuild from 'esbuild'

async function loadJson(filePath) {
    try {
        const content = await readFile(filePath, 'utf-8')
        return JSON.parse(content)
    } catch (err) {
        throw new Error(`❌ Failed to load JSON from ${filePath}: ${err.message}`)
    }
}

import { fileURLToPath } from 'node:url'
import { packageJsonToEsbuildOptions } from './parser'

const vendepsPackageJson = await loadJson(
    resolve(dirname(fileURLToPath(import.meta.url)), 'package.json')
)

const CONFIG_KEY = vendepsPackageJson.name
const DEFAULT_TARGET_DIR = './dependencies'
const DEFAULT_SRC_FILE = './package.json'

const argv = yargs(hideBin(process.argv))
    .usage(`Usage: npx ${vendepsPackageJson.name} [options]`)
    .option('src', {
        alias: 's',
        type: 'string',
        describe: `Path to the package.json file where dependencies and the optional ${CONFIG_KEY} config are located`,
        default: DEFAULT_SRC_FILE,
    })
    .option('target', {
        alias: 't',
        type: 'string',
        describe: 'Output directory (it will be created if it does not exist)',
        default: DEFAULT_TARGET_DIR,
    })
    .option('minify', {
        type: 'boolean',
        describe: 'Minify the output bundles',
        default: false,
    })
    .help('help')
    .alias('help', 'h')
    .epilog(vendepsPackageJson.description)
    .argv;

const targetDir = resolve(process.cwd(), argv.target)
const srcFile = resolve(process.cwd(), argv.src)
const nodeModulesDir = dirname(srcFile)

async function main() {
    // Only use --minify flag
    const minify = argv.minify

    console.time(`Read and parse ${srcFile}`)
    const optionsArr = await packageJsonToEsbuildOptions(await loadJson(srcFile), CONFIG_KEY, nodeModulesDir, targetDir, minify)
    console.timeEnd(`Read and parse ${srcFile}`)
    if (optionsArr.length === 0) {
        console.info('🫙 No dependencies to process. Exiting.')
        return
    }

    await mkdir(targetDir, { recursive: true });
    console.info(`🏃 Updating ${targetDir} for ${optionsArr.length} dependency(ies). Minify: ${minify}`)

    console.time('Build')
    // await Promise.all(optionsArr.map((options) => esbuild.build(options)))
    for (const options of optionsArr) {
        await esbuild.build(options)
    }
    console.timeEnd('Build')
    console.log(`🎉 Updated ${targetDir} dir.`)
}

main().catch((err) => {
    console.error(`❌ ${err}`)
    process.exitCode = 1
})
