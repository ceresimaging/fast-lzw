const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
    library: 'fast-lzw',
    umdNamedDefine: true,
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
            presets: [
              [
                '@babel/preset-env', {
                  useBuiltIns: 'usage',
                  targets: {
                    chrome: "75",
                    firefox: "67"
                  },
                  corejs: 3
                }  
              ]
            ]
          }
        }
      },
      {
        test: /src\/worker\.js$/,
        use: { 
          loader: 'worker-loader',
          options: { inline: true, fallback: false }
        }
      }
    ]
  },
  resolve: {
    alias: {
      'fs$': path.resolve(__dirname, 'src/fs-shim.js')
    }
  }
}