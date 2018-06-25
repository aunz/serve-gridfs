module.exports = {
  entry: ['./test/index.test.js'],
  output: {
    path: require('path').resolve('./test/build'),
    filename: 'bundle.test.js',
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
  mode: 'development',
}
