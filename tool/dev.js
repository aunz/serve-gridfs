require('shelljs').rm('-rf', './test/build')

const config = require('./webpack.config.test.js')

config.entry = ['./test/server.js']
config.output.filename = 'serverBundle.js'
config.mode = 'development'

let child
const builtFile = require('path').join(config.output.path, config.output.filename)

require('webpack')(config).watch({}, (err, stats) => {
  if (stats.hasErrors()) {
    console.log(stats.toString({ colors: true }))
    return
  }
  if (child) child.kill()
  child = require('child_process').fork(builtFile)
  // require('shelljs').exec('node '+builtFile + ' | node_modules\\.bin\\tap-spec')
})
