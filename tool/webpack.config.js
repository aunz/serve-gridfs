// const webpack = require('webpack')

module.exports = {
  entry: ['./src/index.js'],
  output: {
    path: require('path').resolve('./build'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /(node_modules)/,
      use: [{
        loader: 'babel-loader',
        query: {
          
          // plugins: ['transform-runtime'],
          // cacheDirectory: true, //cache into OS temp folder by default
        },
        
      }]
    }],
  },
  plugins: [
  ],
  externals: [
    /^[@a-z][a-z\/\.\-0-9]*$/i, // native modules will be excluded, e.g require('react/server')
  ],
  node: {
    console: true,
    __filename: true,
    __dirname: true,
  },
}
