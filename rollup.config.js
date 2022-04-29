import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import externals from 'rollup-plugin-node-externals';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';

const LOCAL_EXTERNALS = ['./server', './server.cjs', './server.js'];
const NPM_EXTERNALS = ['express-session'];

const generateConfig = (input) => ({
  input: `./packages/lambda/src/${input.filename}.ts`,
  output: {
    file: `./dist-lib/${input.filename}${input.minify ? '' : '.max'}.js`,
    format: 'es',
  },
  plugins: [
    json(),
    commonjs(),
    externals({
      // exclude: 'some-module',
    }),
    // Export Condition Node is not a default and is necessary to get
    // uuid to select `rng.js` instead of `rng-browser.js`
    nodeResolve({ exportConditions: ['node'] }),
    typescript({
      tsconfig: 'tsconfig.bundle.json',
    }),
    input.minify
      ? terser({
          compress: true,
          mangle: true,
          output: { comments: false }, // Remove all comments, which is fine as the handler code is not distributed.
        })
      : undefined,
  ],
  external: [...NPM_EXTERNALS, ...LOCAL_EXTERNALS],
  inlineDynamicImports: true,
});

export default [
  { filename: 'index', minify: false },
  { filename: 'index', minify: true },
].map(generateConfig);
