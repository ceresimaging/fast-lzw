const path = require('path')
const ThreadsPlugin = require('threads-plugin')
const webpack = require('webpack')

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
    library: 'fast-lzw',
    umdNamedDefine: true,
    chunkFilename: '[name].bundle.js'
  },
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /(node_modules|dist)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/env'],
          }
        }
      }
    ]
  },
  plugins: [
    new ThreadsPlugin({
      globalObject: 'self'
    })
  ],
  resolve: {
    alias: {
      'fs$': path.resolve(__dirname, 'src/fs-shim.js')
    }
  }
}