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
      file: pkg.module,
      format: 'es',
    },
    {
      file: pkg.browser,
      format: 'umd',
      name: 'ValidatorFns',
    },
  ],
  plugins: [terser(), bundleSize(), typescript({})],
};
