const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  output: {
    path: join(__dirname, '../../../dist/apps/backend/api'),
    clean: true,
    library: {
      type: 'module',
    },
    chunkFormat: 'module',
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  experiments: {
    outputModule: true,
  },
  externals: [
      nodeExternals({
          importType: 'module',
          modulesDir: join(__dirname, '../../../node_modules')
      })
  ],
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
