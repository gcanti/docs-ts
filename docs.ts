import { main } from './src'
import { defaultOptions } from './src/check'
const pkg = require('./package.json')

const srcDir = 'fixture/**/*.ts'
const outDir = 'docs'
const doTypeCheckExamples = false
const options = { ...defaultOptions }
main(srcDir, outDir, doTypeCheckExamples, pkg.name, options).run()
