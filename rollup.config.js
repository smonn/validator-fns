import bundleSize from 'rollup-plugin-bundle-size';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.main.replace('.js', '.min.js'),
      format: 'cjs',
      plugins: [terser()],
    },
    {
      file: pkg.module,
      format: 'es',
    },
    {
      file: pkg.module.replace('.js', '.min.js'),
      format: 'es',
      plugins: [terser()],
    },
    {
      file: pkg.browser,
      format: 'umd',
      name: 'ValidatorFns',
    },
    {
      file: pkg.browser.replace('.js', '.min.js'),
      format: 'umd',
      name: 'ValidatorFns',
      plugins: [terser()],
    },
  ],
  plugins: [bundleSize(), typescript({})],
};
