/**
 * Base webpack config used across other specific configs
 */

import path from 'path';
import webpack from 'webpack';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';
import webpackPaths from './webpack.paths';
import { dependencies as externals } from '../../release/app/package.json';

// agora-electron-sdk is a native module installed only in release/app.
// In development the renderer is served from http://localhost, where `require`
// resolves from the project root, so point it at release/app explicitly.
// In production the renderer is loaded from release/app/dist (or app.asar),
// where a plain `require('agora-electron-sdk')` resolves correctly.
const agoraSdkPath =
  process.env.NODE_ENV === 'development'
    ? path.join(webpackPaths.appNodeModulesPath, 'agora-electron-sdk')
    : 'agora-electron-sdk';

const configuration: webpack.Configuration = {
  externals: [
    // Must come before the generic list so it takes precedence
    { 'agora-electron-sdk': `commonjs2 ${agoraSdkPath}` },
    ...Object.keys(externals || {}),
  ],

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]',
        },
      },
      {
        test: /\.node$/,
        use: [
          {
            loader: 'native-addon-loader',
            options: {
              name: '[name].[ext]',
              // Chỉ định thư mục output cho native modules
              outputPath: 'native_modules',
            },
          },
        ],
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
    // https://github.com/webpack/webpack/issues/1114
    library: {
      type: 'commonjs2',
    },
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [webpackPaths.srcPath, 'node_modules'],
    // There is no need to add aliases here, the paths in tsconfig get mirrored
    plugins: [new TsconfigPathsPlugins()],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      // Override at build/start time to point the app at another backend,
      // e.g. VISION_API_URL=http://localhost:50002/v1 npm start
      VISION_API_URL: 'https://api.vision20.us/v1',
      VISION_AGORA_APP_ID: '4cfbe7e52ad747ad89ca55a595531f82',
    }),
  ],
};

export default configuration;
