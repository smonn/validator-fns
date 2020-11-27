import bundleSize from 'rollup-plugin-bundle-size';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.module,
      format: 'es',
    },
    {
      file: pkg.main,
      format: 'umd',
      name: 'ValidatorFns',
    },
  ],
  plugins: [bundleSize(), typescript({})],
};
