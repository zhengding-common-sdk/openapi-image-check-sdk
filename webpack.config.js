const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const isProduction = process.env.NODE_ENV === 'production'

const productionConfig = {
  mode: 'production',
  plugins: []
}

const developmentConfig = {
  mode: 'development',
  devtool: 'inline-source-map',
  plugins: []
}

const baseConfig = {
  entry: './src/main.js',

  output: {
    path: path.resolve(__dirname, 'dist'), // 打包后的输出路径
    filename: '[name].js', // 打包后的输出文件名
    library: 'ToadditOpenapiImageCheckSdk',
    // 库的导出方式，支持多种模块规范
    libraryTarget: 'umd',
    // 兼容不同的环境，如浏览器和 Node.js
    globalObject: 'this',
    chunkFilename: '[name].js'
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            pure_funcs: ['console.log']
          }
        }
      })
    ]
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.js', '.jsx', 'json']
  },

  module: {
    rules: [
      {
        test: /\.js$/,  // 对所有 .js 文件进行处理
        exclude: /node_modules/,  // 排除 node_modules 文件夹
        use: {
          loader: 'babel-loader'  // 使用 babel-loader 进行转译
        }
      }
    ]
  },

  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
}

module.exports = merge(baseConfig, isProduction ? productionConfig : developmentConfig)
