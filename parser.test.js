import { it, describe } from 'node:test';
import assert from 'node:assert';
import { _test, packageJsonToEsbuildOptions } from './parser.js';

function tableTest(fn, testCases) {
    testCases.forEach(({ name, args, expected, error }) => {
        it(name, () => {
            if (error) {
                assert.throws(() => fn(...args), error);
            } else {
                assert.deepStrictEqual(fn(...args), expected);
            }
        });
    });
}

describe('configObj()', () => {
    const { configObj } = _test;
    const testCases = [
        {
            name: 'Valid input',
            args: ['my-package', 'default', { key: 'value' }],
            expected: {
                contents: "export default from 'my-package'",
                define: { key: 'value' },
            },
        },
        {
            name: 'Empty package name',
            args: ['', 'default', {}],
            error: RangeError,
        },
    ];

    tableTest(configObj, testCases);
});

describe('normalizedConfig()', () => {
    const { normalizedConfig } = _test;
    const testCases = [
        {
            name: "Non-string package name",
            args: [123, undefined],
            error: TypeError,
        },
        {
            name: "Empty package name",
            args: ['', {}],
            error: RangeError,
        },
        {
            name: "Package name with invalid characters",
            args: ['invalid"name', {}],
            error: SyntaxError,
        },
        {
            name: "Package name with invalid characters",
            args: ['invalid\'name', {}],
            error: SyntaxError,
        },
        {
            name: "Config is null",
            args: ['dep1', null],
            error: TypeError,
        },
        {
            name: "Config is a number",
            args: ['dep1', 42],
            error: TypeError,
        },
        {
            name: "Config object with invalid define type",
            args: ['dep1', { export: '*', from: 'path/to/file.js', define: 123 }],
            error: TypeError,
        },
        {
            name: "Config object with invalid define array",
            args: ['dep1', { export: '*', from: 'path/to/file.js', define: [123, true] }],
            error: TypeError,
        },
        {
            name: "'dep1' with undefined config",
            args: ['dep1', undefined],
            expected: {
                contents: "export * from 'dep1'",
                define: {},
            },
        },
        {
            name: "'dep2' with 'path/to/file2.js'",
            args: ['dep2', 'path/to/file2.js'],
            expected: {
                contents: "export * from 'path/to/file2.js'",
                define: {},
            },
        },
        {
            name: "'dep3' with a config object",
            args: ['dep3', { export: '*', from: 'path/to/file3.js' }],
            expected: {
                contents: "export * from 'path/to/file3.js'",
                define: {},
            },
        },
        {
            name: "'dep3' with an empty config object",
            args: ['dep3', {}],
            expected: {
                contents: "export * from 'dep3'",
                define: {},
            },
        },
        {
            name: "'dep3' without export but with a config object",
            args: ['dep3', { from: 'path/to/file3.js' }],
            expected: {
                contents: "export * from 'path/to/file3.js'",
                define: {},
            },
        },
        {
            name: "'dep3' with export but without from in config object",
            args: ['dep3', { export: 'var' }],
            expected: {
                contents: "export var from 'dep3'",
                define: {},
            },
        },
        {
            name: "'dep4' with a config object and define object",
            args: ['dep4', { export: '*', from: 'path/to/file4.js', define: { key1: 'value1', key2: 'value2' } }],
            expected: {
                contents: "export * from 'path/to/file4.js'",
                define: { key1: 'value1', key2: 'value2' },
            },
        },
        {
            name: "'dep5' with a config object and define array",
            args: ['dep5', { export: '*', from: 'path/to/file4.js', define: ['FLAG1', 'FLAG2'] }],
            expected: {
                contents: "export * from 'path/to/file4.js'",
                define: { FLAG1: 'true', FLAG2: 'true' },
            },
        },
    ];

    tableTest(normalizedConfig, testCases);
});

describe('toEsbuildOptions()', () => {
    const { toEsbuildOptions } = _test;

    it('should return correct options for valid inputs', () => {
        const name = 'example';
        const config = 'configString';
        const resolveDir = '/path/to/dir';
        const minify = true;
        const outfile = '/path/to/output.js';

        const result = toEsbuildOptions(name, config, resolveDir, minify, outfile);

        assert.deepStrictEqual(result, {
            bundle: true,
            minify: true,
            format: 'esm',
            define: {},
            stdin: {
                contents: "export * from 'configString'",
                resolveDir: '/path/to/dir',
                loader: 'js',
            },
            outfile: '/path/to/output.js',
        });
    });

    it('should throw error for null config', () => {
        const name = 'example';
        const config = null;
        const resolveDir = '/path/to/dir';
        const minify = false;
        const outfile = '/path/to/output.js';

        assert.throws(() => toEsbuildOptions(name, config, resolveDir, minify, outfile), {
            name: 'TypeError',
            message: 'Error processing config for example: When specified, config should be a string or object, got null.'
        });
    });

    it('should throw error for array config', () => {
        const name = 'example';
        const config = [];
        const resolveDir = '/path/to/dir';
        const minify = false;
        const outfile = '/path/to/output.js';

        assert.throws(() => toEsbuildOptions(name, config, resolveDir, minify, outfile), {
            name: 'TypeError',
            message: 'Error processing config for example: When specified, config should be a string or object, got array.'
        });
    });

    it('should handle object config with export and from', () => {
        const name = 'example';
        const config = { export: 'default', from: 'source' };
        const resolveDir = '/path/to/dir';
        const minify = false;
        const outfile = '/path/to/output.js';

        const result = toEsbuildOptions(name, config, resolveDir, minify, outfile);

        assert.deepStrictEqual(result, {
            bundle: true,
            minify: false,
            format: 'esm',
            define: {},
            stdin: {
                contents: "export default from 'source'",
                resolveDir: '/path/to/dir',
                loader: 'js',
            },
            outfile: '/path/to/output.js',
        });
    });
});

describe('toEsbuildOptionsArr()', () => {
    const { toEsbuildOptionsArr } = _test;

    it('should return an array of options for valid inputs', () => {
        const names = ['example1', 'example2'];
        const vendepsConfig = {
            example1: 'config1',
            example2: { export: 'default', from: 'source2' },
        };
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        const result = toEsbuildOptionsArr(names, vendepsConfig, resolveDir, minify, targetDir);

        assert.deepStrictEqual(result, [
            {
                bundle: true,
                minify: true,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'config1'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example1.js',
            },
            {
                bundle: true,
                minify: true,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export default from 'source2'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example2.js',
            },
        ]);
    });


    it('should throw an error for invalid inputs', () => {
        const names = 'not-an-array';
        const vendepsConfig = {};
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        assert.throws(() => toEsbuildOptionsArr(names, vendepsConfig, resolveDir, minify, targetDir), {
            name: 'TypeError',
            message: 'Expected an array of names. Got not-an-array (string).',
        });
    });

    // Skipping test for null/false configs: now handled in packageJsonToEsbuildOptions

    it('should returns an esbuild options array even when there are no configs', () => {
        const names = ['example1x', 'example2x', 'example3x'];
        const vendepsConfig = undefined;
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        const result = toEsbuildOptionsArr(names, vendepsConfig, resolveDir, minify, targetDir);

        assert.deepStrictEqual(result, [
            {
                bundle: true,
                minify: true,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'example1x'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example1x.js',
            },
            {
                bundle: true,
                minify: true,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'example2x'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example2x.js',
            },
            {
                bundle: true,
                minify: true,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'example3x'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example3x.js',
            },
        ]);
    });
});

describe('packageJsonToEsbuildOptions()', () => {
    it('should throw if packageJson is not an object', async () => {
        await assert.rejects(
            () => packageJsonToEsbuildOptions(null, 'vendeps', '/modules', '/target', false),
            {
                name: 'TypeError',
                message: 'Invalid package.json object'
            }
        );
    });

    it('should throw if dependencies is missing', async () => {
        await assert.rejects(
            () => packageJsonToEsbuildOptions({}, 'vendeps', '/modules', '/target', false),
            {
                name: 'TypeError',
                message: "No 'dependencies' object found"
            }
        );
    });

    it('should throw if no dependencies to process after filtering', async () => {
        const pkg = { dependencies: { a: '1.0.0' }, vendeps: { a: false } };
        await assert.rejects(
            () => packageJsonToEsbuildOptions(pkg, 'vendeps', '/modules', '/target', false),
            {
                name: 'Error',
                message: 'No dependencies to process after filtering with config.'
            }
        );
    });

    it('should return correct esbuild options array with filtered dependencies', async () => {
        const pkg = {
            dependencies: {
                a: '1.0.0',
                b: '2.0.0',
                c: '3.0.0',
                d: '4.0.0',
                e: '5.0.0',
            },
            vendeps: {
                b: false,
                d: null,
                // a, c, e are included
            }
        };
        const result = await packageJsonToEsbuildOptions(pkg, 'vendeps', '/modules', '/target', true);
        // Only a, c, e should be present
        assert.deepStrictEqual(result, [
        {
            bundle: true,
            define: {},
            format: 'esm',
            minify: true,
            outfile: '/target/a.js',
            stdin: {
                contents: "export * from 'a'",
                loader: 'js',
                resolveDir: '/modules'
            }
        },
        {
            bundle: true,
            define: {},
            format: 'esm',
            minify: true,
            outfile: '/target/c.js',
            stdin: {
                contents: "export * from 'c'",
                loader: 'js',
                resolveDir: '/modules'
            }
        },
        {
            bundle: true,
            define: {},
            format: 'esm',
            minify: true,
            outfile: '/target/e.js',
            stdin: {
                contents: "export * from 'e'",
                loader: 'js',
                resolveDir: '/modules'
            }
        }
    ]);
    });
});
