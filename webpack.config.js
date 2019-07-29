const path = require('path')
const ThreadsPlugin = require('threads-plugin')
const webpack = require('webpack')

module.exports = {
  entry: './index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2'
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
    new ThreadsPlugin(),
    // Emscripten outputs a require('fs') line for ES6 modules
    // which breaks browser compilation
    new webpack.IgnorePlugin({
      resourceRegExp: /^fs$/
    })
  ]
}