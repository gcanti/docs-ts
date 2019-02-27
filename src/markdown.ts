import * as prettier from 'prettier'
import { Option } from 'fp-ts/lib/Option'
import { Class, Node, fold, Func, Interface, Method } from './parser'
import * as path from 'path'

export const CRLF = '\n\n'
export const h1 = (title: string) => `# ${title}`
export const h2 = (title: string) => `## ${title}`
export const h3 = (title: string) => `### ${title}`
export const fence = (language: string) => (code: string): string => '```' + language + '\n' + code + '\n' + '```'
export const code = (code: string) => '`' + code + '`'
export const link = (text: string, href: string) => `[${text}](${href})`
export const ts = fence('ts')
export const italic = (code: string) => '*' + code + '*'
export const bold = (code: string) => '**' + code + '**'
export const strike = (text: string) => '~~' + text + '~~'

const prettierOptions: prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

export function header(title: string, order: number): string {
  let s = '---\n'
  s += `title: ${title}\n`
  s += `nav_order: ${order}\n`
  s += '---\n\n'
  return s
}

function handleDeprecated(s: string, deprecated: boolean): string {
  return deprecated ? strike(s) + ' (deprecated)' : s
}

function printInterface(i: Interface): string {
  let s = h1(i.name)
  s += printDescription(i.description)
  s += printSignature(i.signature, 'interface')
  s += printSince(i.since)
  s += CRLF
  return s
}

function printFunction(f: Func): string {
  let s = h1(f.name)
  s += printDescription(f.description)
  s += printSignatures(f.signatures, 'function')
  s += printExample(f.example)
  s += printSince(f.since)
  s += CRLF
  return s
}

type SignatureType = 'function' | 'static function' | 'method' | 'interface' | 'class'

function printSignature(signature: string, type: SignatureType): string {
  return CRLF + bold('Signature') + ` (${type})` + CRLF + ts(signature)
}

function printSignatures(signature: Array<string>, type: SignatureType): string {
  return CRLF + bold('Signature') + ` (${type})` + CRLF + ts(signature.join('\n'))
}

function printDescription(description: Option<string>): string {
  return description.fold('', s => CRLF + s)
}

function printExample(example: Option<string>): string {
  return example.fold('', s => CRLF + bold('Example') + CRLF + ts(s))
}

function printSince(since: Option<string>): string {
  return since.fold('', s => CRLF + `Added in v${s}`)
}

function printMethod(m: Method): string {
  let s = h2(handleDeprecated(m.name, m.deprecated))
  s += printDescription(m.description)
  s += printSignatures(m.signatures, 'method')
  s += printExample(m.example)
  s += printSince(m.since)
  s += CRLF
  return s
}

function printClass(c: Class): string {
  let s = h1(c.name)
  s += printDescription(c.description)
  s += printSignature(c.signature, 'class')
  s += printExample(c.example)
  s += printSince(c.since)
  s += CRLF
  s += c.staticMethods.map(printMethod).join(CRLF)
  s += c.methods.map(printMethod).join(CRLF)
  s += CRLF
  return s
}

export function run(node: Node): string {
  return prettier.format(
    fold(
      node,
      (_, children) => {
        return (
          children
            .map(name => {
              const isIndex = path.parse(name).ext === ''
              return isIndex
                ? '- ' + link(code(name) + ' directory', './' + name + '/' + 'index.md')
                : '- ' + link(code(name) + ' file', './' + name + '.md')
            })
            .join('\n') + '\n'
        )
      },
      (_p, interfaces, functions, classes) => {
        return (
          interfaces.map(i => printInterface(i)).join('') +
          functions.map(f => printFunction(f)).join('') +
          classes.map(c => printClass(c)).join('')
        )
      }
    ),
    prettierOptions
  )
}
