import * as parser from './parser'
import { log } from 'fp-ts/lib/Console'
import { IO, io } from 'fp-ts/lib/IO'
import * as markdown from './markdown'
import * as path from 'path'
import * as fs from 'fs-extra'
import { tree } from 'fp-ts/lib/Tree'
import { Validation, success, failure } from 'fp-ts/lib/Validation'
import { array, sort } from 'fp-ts/lib/Array'
import { toArray } from 'fp-ts/lib/Foldable2v'
import { ordString, contramap } from 'fp-ts/lib/Ord'

function writeFileSync(path: string, content: string): Validation<Array<string>, IO<void>> {
  try {
    return success(log(`Printing module ${path}`).applySecond(new IO(() => fs.outputFileSync(path, content))))
  } catch (e) {
    return failure([`Cannot open file ${path}: ${e}`])
  }
}

function getOutpuPath(outDir: string, node: parser.Node): string {
  return parser.fold(
    node,
    p => path.join(outDir, p.slice(1).join(path.sep) + path.sep + 'index.md'),
    p => path.join(outDir, p.slice(1).join(path.sep) + '.md')
  )
}

/**
 * @since 0.0.1
 */
export function main(pattern: string, outDir: string): IO<void> {
  let counter = 1

  function writeNode(node: parser.Node): Validation<Array<string>, IO<void>> {
    switch (node.type) {
      case 'Index':
        return success(log(`Detected directory ${node.path.join('/')}`))
      case 'Module':
        const header = markdown.header(node.path.slice(1).join('/'), counter++)
        return writeFileSync(getOutpuPath(outDir, node), header + markdown.run(node))
    }
  }

  return parser.monadValidation
    .chain(parser.run(pattern), forest => {
      const nodes = array.chain(forest, t => toArray(tree)(t))
      const sorted = sort(contramap((node: parser.Node) => node.path.join('/').toLowerCase(), ordString))(nodes)
      return array.traverse(parser.monadValidation)(sorted, writeNode)
    })
    .map(a =>
      array
        .sequence(io)(a)
        .map(() => undefined)
    )
    .fold(errors => log(`Errors: ${errors.join('\n')}`), a => a.map(() => undefined))
}
