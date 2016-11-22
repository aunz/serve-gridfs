module.exports = {
  entry: ['./test/index.test.js'],
  output: {
    path: './test/build',
    filename: 'bundle.test.js',
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  module: {
    loaders: [{
      test: /\.jsx?$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader',
      query: {
        presets: ['latest', 'stage-0'],
        // plugins: ['transform-runtime'],
        // cacheDirectory: true, //cache into OS temp folder by default
      },
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
