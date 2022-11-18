import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import filesize from 'rollup-plugin-filesize';
import packageJSON from './package.json' assert { type: 'json' };

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
        file: packageJSON.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJSON.module,
        format: 'es',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: packageJSON.typings,
      format: 'es',
    },
  }),
];

export default config;
