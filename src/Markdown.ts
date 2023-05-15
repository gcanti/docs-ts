/**
 * @since 0.9.0
 */
import { pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as ReadonlyRecord from '@effect/data/ReadonlyRecord'
import * as String from '@effect/data/String'
import * as Order from '@effect/data/typeclass/Order'
import * as Prettier from 'prettier'

import * as Domain from './Domain'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const toc = require('markdown-toc')

type Printable = Domain.Class | Domain.Constant | Domain.Export | Domain.Function | Domain.Interface | Domain.TypeAlias

const bold = (s: string) => `**${s}**`

const fence = (language: string, content: string) => '```' + language + '\n' + content + '\n' + '```\n\n'

const paragraph = (...content: ReadonlyArray<string>) => '\n' + content.join('') + '\n\n'

const strikethrough = (content: string) => `~~${content}~~`

const createHeader =
  (level: number) =>
  (content: string): string =>
    '#'.repeat(level) + ' ' + content + '\n\n'

const h1 = createHeader(1)

const h2 = createHeader(2)

const h3 = createHeader(3)

const getSince: (v: Option.Option<string>) => string = Option.match(
  () => '',
  (v) => paragraph(`Added in v${v}`)
)

const getTitle = (s: string, deprecated: boolean, type?: string): string => {
  const name = s.trim() === 'hasOwnProperty' ? `${s} (function)` : s
  const title = deprecated ? strikethrough(name) : name
  return pipe(
    Option.fromNullable(type),
    Option.match(
      () => title,
      (t) => title + ` ${t}`
    )
  )
}

const getDescription = (d: Option.Option<string>): string => paragraph(Option.getOrElse(d, () => ''))

const getSignature = (s: string): string => paragraph(bold('Signature')) + paragraph(fence('ts', s))

const getSignatures = (ss: ReadonlyArray<string>): string =>
  paragraph(bold('Signature')) + paragraph(fence('ts', ss.join('\n')))

const getExamples = (es: ReadonlyArray<string>): string =>
  es.map((code) => paragraph(bold('Example')) + paragraph(fence('ts', code))).join('\n\n')

const getStaticMethod = (m: Domain.Method): string =>
  paragraph(
    h3(getTitle(m.name, m.deprecated, '(static method)')),
    getDescription(m.description),
    getSignatures(m.signatures),
    getExamples(m.examples),
    getSince(m.since)
  )

const getMethod = (m: Domain.Method): string =>
  paragraph(
    h3(getTitle(m.name, m.deprecated, '(method)')),
    getDescription(m.description),
    getSignatures(m.signatures),
    getExamples(m.examples),
    getSince(m.since)
  )

const getProperty = (p: Domain.Property): string =>
  paragraph(
    h3(getTitle(p.name, p.deprecated, '(property)')),
    getDescription(p.description),
    getSignature(p.signature),
    getExamples(p.examples),
    getSince(p.since)
  )

const getStaticMethods = (methods: ReadonlyArray<Domain.Method>): string =>
  ReadonlyArray.map(methods, (method) => getStaticMethod(method) + '\n\n').join('')

const getMethods = (methods: ReadonlyArray<Domain.Method>): string =>
  ReadonlyArray.map(methods, (method) => getMethod(method) + '\n\n').join('')

const getProperties = (properties: ReadonlyArray<Domain.Property>): string =>
  ReadonlyArray.map(properties, (property) => getProperty(property) + '\n\n').join('')

const getModuleDescription = (module: Domain.Module): string =>
  paragraph(
    h2(getTitle(module.name, module.deprecated, 'overview')),
    getDescription(module.description),
    getExamples(module.examples),
    getSince(module.since)
  )

const getMeta = (title: string, order: number): string =>
  paragraph('---', `\n`, `title: ${title}`, `\n`, `nav_order: ${order}`, `\n`, `parent: Modules`, `\n`, '---')

const fromClass = (c: Domain.Class): string =>
  paragraph(
    paragraph(
      h2(getTitle(c.name, c.deprecated, '(class)')),
      getDescription(c.description),
      getSignature(c.signature),
      getExamples(c.examples),
      getSince(c.since)
    ),
    getStaticMethods(c.staticMethods),
    getMethods(c.methods),
    getProperties(c.properties)
  )

const fromConstant = (c: Domain.Constant): string =>
  paragraph(
    h2(getTitle(c.name, c.deprecated)),
    getDescription(c.description),
    getSignature(c.signature),
    getExamples(c.examples),
    getSince(c.since)
  )

const fromExport = (e: Domain.Export): string =>
  paragraph(
    h2(getTitle(e.name, e.deprecated)),
    getDescription(e.description),
    getSignature(e.signature),
    getExamples(e.examples),
    getSince(e.since)
  )

const fromFunction = (f: Domain.Function): string =>
  paragraph(
    h2(getTitle(f.name, f.deprecated)),
    getDescription(f.description),
    getSignatures(f.signatures),
    getExamples(f.examples),
    getSince(f.since)
  )

const fromInterface = (i: Domain.Interface): string =>
  paragraph(
    h2(getTitle(i.name, i.deprecated, '(interface)')),
    getDescription(i.description),
    getSignature(i.signature),
    getExamples(i.examples),
    getSince(i.since)
  )

const fromTypeAlias = (ta: Domain.TypeAlias): string =>
  paragraph(
    h2(getTitle(ta.name, ta.deprecated, '(type alias)')),
    getDescription(ta.description),
    getSignature(ta.signature),
    getExamples(ta.examples),
    getSince(ta.since)
  )

/** @internal */
export const fromPrintable = (p: Printable): string => {
  switch (p._tag) {
    case 'Class':
      return fromClass(p)
    case 'Constant':
      return fromConstant(p)
    case 'Export':
      return fromExport(p)
    case 'Function':
      return fromFunction(p)
    case 'Interface':
      return fromInterface(p)
    case 'TypeAlias':
      return fromTypeAlias(p)
  }
}

const getPrintables = (module: Domain.Module): ReadonlyArray<Printable> =>
  ReadonlyArray.getMonoid<Printable>().combineAll([
    module.classes,
    module.constants,
    module.exports,
    module.functions,
    module.interfaces,
    module.typeAliases
  ])

/**
 * @category printers
 * @since 0.9.0
 */
export const printModule = (module: Domain.Module, order: number): string => {
  const DEFAULT_CATEGORY = 'utils'

  const header = getMeta(module.path.slice(1).join('/'), order)

  const description = paragraph(getModuleDescription(module))

  const content = pipe(
    getPrintables(module),
    ReadonlyArray.groupBy(({ category }) =>
      pipe(
        category,
        Option.getOrElse(() => DEFAULT_CATEGORY)
      )
    ),
    ReadonlyRecord.toEntries,
    ReadonlyArray.sort(Order.contramap(String.Order, ([category]: [string, unknown]) => category)),
    ReadonlyArray.map(([category, printables]) =>
      [
        h1(category),
        ...pipe(
          printables,
          ReadonlyArray.sort(Order.contramap(String.Order, (printable: Printable) => printable.name)),
          ReadonlyArray.map(fromPrintable)
        )
      ].join('\n')
    )
  ).join('\n')

  const tableOfContents = (content: string) =>
    '<h2 class="text-delta">Table of contents</h2>\n\n' + toc(content).content + '\n\n'

  return prettify([header, description, '---\n', tableOfContents(content), '---\n', content].join('\n'))
}

const defaultPrettierOptions: Prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

/** @internal */
export const prettify = (s: string): string => Prettier.format(s, defaultPrettierOptions)
