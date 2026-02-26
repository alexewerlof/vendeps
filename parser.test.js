import { it, describe } from 'node:test';
import assert from 'node:assert';
import { _test, toEslintOptionsArr } from './parser.js';

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
                define: { key1: 'value1', key2: 'value2'},
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

describe('toEslintOptions()', () => {
    const { toEslintOptions } = _test;

    it('should return correct options for valid inputs', () => {
        const name = 'example';
        const config = 'configString';
        const resolveDir = '/path/to/dir';
        const minify = true;
        const outfile = '/path/to/output.js';

        const result = toEslintOptions(name, config, resolveDir, minify, outfile);

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

        assert.throws(() => toEslintOptions(name, config, resolveDir, minify, outfile), {
            name: 'TypeError',
            message: 'When specified, config should be a string or object, got null.'
        });
    });

    it('should throw error for array config', () => {
        const name = 'example';
        const config = [];
        const resolveDir = '/path/to/dir';
        const minify = false;
        const outfile = '/path/to/output.js';

        assert.throws(() => toEslintOptions(name, config, resolveDir, minify, outfile), {
            name: 'TypeError',
            message: 'When specified, config should be a string or object, got array.'
        });
    });

    it('should handle object config with export and from', () => {
        const name = 'example';
        const config = { export: 'default', from: 'source' };
        const resolveDir = '/path/to/dir';
        const minify = false;
        const outfile = '/path/to/output.js';

        const result = toEslintOptions(name, config, resolveDir, minify, outfile);

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

describe('toEslintOptionsArr()', () => {
    it('should return an array of options for valid inputs', () => {
        const names = ['example1', 'example2'];
        const unConfig = {
            example1: 'config1',
            example2: { export: 'default', from: 'source2' },
        };
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        const result = toEslintOptionsArr(names, unConfig, resolveDir, minify, targetDir);

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

    it('should skip names with null or false configs', () => {
        const names = ['example11', 'example22', 'example33'];
        const unConfig = {
            example11: null,
            example22: false,
            example33: 'config3',
        };
        const resolveDir = '/path/to/dir';
        const minify = false;
        const targetDir = '/path/to/target';

        const result = toEslintOptionsArr(names, unConfig, resolveDir, minify, targetDir);

        assert.deepStrictEqual(result, [
            null,
            null,
            {
                bundle: true,
                minify: false,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'config3'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example33.js',
            },
        ]);
    });

    it('should throw an error for invalid inputs', () => {
        const names = 'not-an-array';
        const unConfig = {};
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        assert.throws(() => toEslintOptionsArr(names, unConfig, resolveDir, minify, targetDir), {
            name: 'TypeError',
            message: 'Expected an array of names. Got not-an-array (string).',
        });
    });

    it('should returns a config for anything that is not opted out', () => {
        const names = ['example1a', 'example2a', 'example3a'];
        const unConfig = {
            example2a: false,
        };
        const resolveDir = '/path/to/dir';
        const minify = false;
        const targetDir = '/path/to/target';

        const result = toEslintOptionsArr(names, unConfig, resolveDir, minify, targetDir);

        assert.deepStrictEqual(result, [
            {
                bundle: true,
                minify: false,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'example1a'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example1a.js',
            },
            null,
            {
                bundle: true,
                minify: false,
                format: 'esm',
                define: {},
                stdin: {
                    contents: "export * from 'example3a'",
                    resolveDir: '/path/to/dir',
                    loader: 'js',
                },
                outfile: '/path/to/target/example3a.js',
            },
        ]);
    });

    it('should returns a eslint options array even when there are no configs', () => {
        const names = ['example1x', 'example2x', 'example3x'];
        const unConfig = undefined;
        const resolveDir = '/path/to/dir';
        const minify = true;
        const targetDir = '/path/to/target';

        const result = toEslintOptionsArr(names, unConfig, resolveDir, minify, targetDir);

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