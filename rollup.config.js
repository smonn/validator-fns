import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import filesize from 'rollup-plugin-filesize';
import { main, module, typings } from './package.json';

const bundle = (config) => ({
  ...config,
  input: 'src/index.ts',
  external: (id) => !/^[./]/.test(id),
});

const config = [
  bundle({
    plugins: [esbuild(), filesize()],
    output: [
      {
        file: main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: module,
        format: 'es',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: typings,
      format: 'es',
    },
  }),
];

export default config;
