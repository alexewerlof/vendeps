import { isArr, isBool, isObj, isStr } from "jty"
import { join } from "node:path"
const SKIP_CONFIG_VALUES = [null, false]

function configObj(frm, exp = '*', def = {}) {
    if (!isStr(frm)) {
        throw new TypeError(`'from' must be a string. Got ${frm} (${typeof frm})`)
    }
    if (frm.length === 0) {
        throw new RangeError(`'from' cannot be an empty string.`)
    }
    // Name cannot contain quotation marks ' or ", as they would break the generated code.
    if (frm.includes('"') || frm.includes("'")) {
        throw new SyntaxError(`'from' cannot contain quotation marks. Got ${frm}`)
    }

    if (!isStr(exp)) {
        throw new TypeError(`'export' should be a string. Got ${exp} (${typeof exp}).`)
    }
    if (exp.length === 0) {
        throw new RangeError(`'export' cannot be an empty string.`)
    }

    if (!isObj(def)) {
        throw new TypeError(`'define' should be an object. Got ${def} (${typeof def}).`)
    }
    if (Array.isArray(def)) {
        const arr = def
        def = {}

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i]
            if (!isStr(item)) {
                throw new TypeError(`When 'define' is an array, all items should be strings. Got ${item} (${typeof item}) at index ${i}.`)
            }
            def[item] = String(true)
        }
    }

    const ret = {
        contents: `export ${exp} from '${frm}'`,
        define: def || {},
    }
    return ret
}

function normalizedConfig(name, config) {
    switch (typeof config) {
        case 'undefined':
            return configObj(name)
        case 'string':
            return configObj(config)
        case 'object':
            if (config === null) {
                throw new TypeError(`When specified, config should be a string or object, got null.`)
            }
            if (Array.isArray(config)) {
                throw new TypeError(`When specified, config should be a string or object, got array.`)
            }
            const { export: exp, from: frm = name, define: def } = config
            return configObj(frm, exp, def)
        default:
            throw new TypeError(`When specified, config should be a string or object, got ${typeof config}.`)
    }
}

function toEsbuildOptions(name, config, resolveDir, minify, outfile) {
    try {
        const { contents, define } = normalizedConfig(name, config)
        console.log(`${name}: ${contents}`)
        return {
            bundle: true,
            minify,
            format: 'esm',
            define,
            stdin: {
                contents,
                resolveDir,
                loader: 'js',
            },
            outfile,
        }
    } catch (err) {
        err.message = `Error processing config for ${name}: ${err.message}`
        throw err
    }
}

function toEsbuildOptionsArr(names, vendepsConfig = {}, resolveDir, minify, targetDir) {
    if (!isArr(names)) {
        throw new TypeError(`Expected an array of names. Got ${names} (${typeof names}).`)
    }
    if (!isStr(resolveDir)) {
        throw new TypeError(`Expected 'resolveDir' to be a string. Got ${resolveDir} (${typeof resolveDir}).`)
    }
    if (!isBool(minify)) {
        throw new TypeError(`Expected 'minify' to be a boolean. Got ${minify} (${typeof minify}).`)
    }
    if (!isStr(targetDir)) {
        throw new TypeError(`Expected 'targetDir' to be a string. Got ${targetDir} (${typeof targetDir}).`)
    }

    return names.map((name) => toEsbuildOptions(name, vendepsConfig?.[name], resolveDir, minify, join(targetDir, `${name}.js`)))
}

export async function packageJsonToEsbuildOptions(packageJson, configKey, resolveDir, targetDir, minify) {
    if (!isObj(packageJson)) {
        throw new TypeError(`Invalid package.json object`)
    }
    const { dependencies, [configKey]: vendepsConfig } = packageJson
    if (!isObj(dependencies)) {
        throw new TypeError(`No 'dependencies' object found`)
    }

    const dependencyNames = Object.keys(dependencies)
        .filter((name) => vendepsConfig && !SKIP_CONFIG_VALUES.includes(vendepsConfig?.[name]))
    
    if (dependencyNames.length === 0) {
        throw new Error('No dependencies to process after filtering with config.')
    }

    return toEsbuildOptionsArr(dependencyNames, vendepsConfig, resolveDir, minify, targetDir).filter(Boolean)
}

export const _test = {
    configObj,
    normalizedConfig,
    toEsbuildOptions,
    toEsbuildOptionsArr,
}