import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin.js';
import { join } from 'path';
import TsConfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  output: {
    path: join(__dirname, '../../../dist/apps/backend/api'),
    clean: true,
    module: true,
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
    environment: {
      module: true,
    },
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    plugins: [
      new TsConfigPathsPlugin({
        configFile: join(__dirname, 'tsconfig.app.json'),
      }),
    ],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        {
          input: './src/app/mail/templates',
          glob: '**/*.hbs',
          output: 'templates',
        },
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: true,
    }),
  ],
};
