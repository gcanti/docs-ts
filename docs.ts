import { main } from './src'
const pkg = require('./package.json')

const srcDir = 'fixture/**/*.ts'
const outDir = 'docs'
const doTypeCheckExamples = false
main(srcDir, outDir, doTypeCheckExamples, pkg.name).run()
