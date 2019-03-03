/**
 * @file markdown utilities
 */

import * as prettier from 'prettier'
import { Option } from 'fp-ts/lib/Option'
import { Class, Func, Interface, Method, TypeAlias, Constant, Module, Export } from './parser'
import { Validation, failure, success } from 'fp-ts/lib/Validation'
const toc = require('markdown-toc')

const CRLF = '\n\n'
const h1 = (title: string) => `# ${title}`
const h2 = (title: string) => `## ${title}`
const fence = (language: string) => (code: string): string => '```' + language + '\n' + code + '\n' + '```'
const ts = fence('ts')
const bold = (code: string) => '**' + code + '**'
const strike = (text: string) => '~~' + text + '~~'

const linkRe = /{@link\s+(.*?)}/g

export function parseLink(s: string): Validation<Array<string>, RegExpMatchArray> {
  const m = s.match(linkRe)
  if (m === null) {
    return failure([`Invalid link ${JSON.stringify(s)}`])
  } else {
    return success(m)
  }
}

const prettierOptions: prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

function handleDeprecated(s: string, deprecated: boolean): string {
  return deprecated ? strike(s) : s
}

function printInterface(i: Interface): string {
  let s = h1(handleDeprecated(i.name, i.deprecated) + ' (interface)')
  s += printDescription(i.description)
  s += printSignature(i.signature)
  s += printExample(i.example)
  s += printSince(i.since)
  s += CRLF
  return s
}

function printTypeAlias(ta: TypeAlias): string {
  let s = h1(handleDeprecated(ta.name, ta.deprecated) + ' (type alias)')
  s += printDescription(ta.description)
  s += printSignature(ta.signature)
  s += printExample(ta.example)
  s += printSince(ta.since)
  s += CRLF
  return s
}

function printConstant(c: Constant): string {
  let s = h1(handleDeprecated(c.name, c.deprecated) + ' (constant)')
  s += printDescription(c.description)
  s += printSignature(c.signature)
  s += printExample(c.example)
  s += printSince(c.since)
  s += CRLF
  return s
}

function printFunction(f: Func): string {
  let s = h1(handleDeprecated(f.name, f.deprecated) + ' (function)')
  s += printDescription(f.description)
  s += printSignatures(f.signatures)
  s += printExample(f.example)
  s += printSince(f.since)
  s += CRLF
  return s
}

function printExport(e: Export): string {
  let s = h1(handleDeprecated(e.name, e.deprecated) + ' (export)')
  s += printDescription(e.description)
  s += printSignature(e.signature)
  s += printExample(e.example)
  s += printSince(e.since)
  s += CRLF
  return s
}

function printMethod(m: Method): string {
  let s = h2(handleDeprecated(m.name, m.deprecated) + ' (method)')
  s += printDescription(m.description)
  s += printSignatures(m.signatures)
  s += printExample(m.example)
  s += printSince(m.since)
  s += CRLF
  return s
}

function printClass(c: Class): string {
  let s = h1(handleDeprecated(c.name, c.deprecated) + ' (class)')
  s += printDescription(c.description)
  s += printSignature(c.signature)
  s += printExample(c.example)
  s += printSince(c.since)
  s += CRLF
  s += c.staticMethods.map(printMethod).join(CRLF)
  s += c.methods.map(printMethod).join(CRLF)
  s += CRLF
  return s
}

function printSignature(signature: string): string {
  return CRLF + bold('Signature') + CRLF + ts(signature)
}

function printSignatures(signature: Array<string>): string {
  return CRLF + bold('Signature') + CRLF + ts(signature.join('\n'))
}

function printDescription(description: Option<string>): string {
  return description.fold('', s => CRLF + s)
}

function printModuleDescription(description: Option<string>): string {
  return description.fold('', s => CRLF + h1('Overview') + CRLF + s + CRLF)
}

function printExample(example: Option<string>): string {
  return example.fold('', s => CRLF + bold('Example') + CRLF + ts(s))
}

function printSince(since: Option<string>): string {
  return since.fold('', s => CRLF + `Added in v${s}`)
}

export function printHeader(title: string, order: number): string {
  let s = '---\n'
  s += `title: ${title}\n`
  s += `nav_order: ${order}\n`
  s += `parent: Modules\n`
  s += '---\n\n'
  return s
}

export function printModule(module: Module, counter: number): string {
  const header = printHeader(module.path.slice(1).join('/'), counter)
  const md =
    CRLF +
    module.interfaces.map(i => printInterface(i)).join('') +
    module.typeAliases.map(i => printTypeAlias(i)).join('') +
    module.classes.map(c => printClass(c)).join('') +
    module.constants.map(c => printConstant(c)).join('') +
    module.functions.map(f => printFunction(f)).join('') +
    module.exports.map(e => printExport(e)).join('')

  const result =
    header +
    printModuleDescription(module.description) +
    '<h2 class="text-delta">Table of contents</h2>' +
    CRLF +
    toc(md).content +
    md
  return prettier.format(result, prettierOptions)
}
