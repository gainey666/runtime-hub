/**
 * Webpack Configuration for the UI System
 * Builds the React components for the web
 */

import path from 'path';
import { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';

const config: Configuration = {
  mode: 'development',
  entry: {
    'node-editor': './src/ui/web/NodeEditorApp.tsx',
    'auto-clicker': './src/ui/web/AutoClickerApp.tsx',
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/ui'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: '/ui/',
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/ui/components'),
      '@/types': path.resolve(__dirname, 'src/ui/types'),
      '@/utils': path.resolve(__dirname, 'src/ui/utils'),
      '@/services': path.resolve(__dirname, 'src/ui/services'),
      '@/tokens': path.resolve(__dirname, 'ui/design_tokens'),
    },
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/node-editor.html',
      filename: 'node-editor.html',
      chunks: ['node-editor'],
      inject: 'body',
    }),
    new HtmlWebpackPlugin({
      template: './public/auto-clicker.html',
      filename: 'auto-clicker.html',
      chunks: ['auto-clicker'],
      inject: 'body',
    }),
  ],
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  
  devServer: {
    port: 3000,
    host: 'localhost',
    hot: true,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'dist/ui'),
      publicPath: '/ui',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  } as WebpackDevServerConfiguration,
  
  devtool: 'eval-source-map',
  
  stats: {
    children: false,
    entrypoints: false,
  },
};

export default config;
