/**
 * @since 0.9.0
 */
import { flow, pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as ReadonlyRecord from '@effect/data/ReadonlyRecord'
import * as String from '@effect/data/String'
import * as Monoid from '@effect/data/typeclass/Monoid'
import * as Order from '@effect/data/typeclass/Order'
import * as Semigroup from '@effect/data/typeclass/Semigroup'
import * as Prettier from 'prettier'

import * as Module from './Module'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const toc = require('markdown-toc')

/** @internal */
export type Printable =
  | Module.Class
  | Module.Constant
  | Module.Export
  | Module.Function
  | Module.Interface
  | Module.TypeAlias

/** @internal */
export type Markdown = Bold | Fence | Header | Newline | Paragraph | PlainText | PlainTexts | Strikethrough

interface Bold {
  readonly _tag: 'Bold'
  readonly content: Markdown
}

interface Fence {
  readonly _tag: 'Fence'
  readonly language: string
  readonly content: Markdown
}

interface Header {
  readonly _tag: 'Header'
  readonly level: number
  readonly content: Markdown
}

interface Newline {
  readonly _tag: 'Newline'
}

interface Paragraph {
  readonly _tag: 'Paragraph'
  readonly content: Markdown
}

interface PlainText {
  readonly _tag: 'PlainText'
  readonly content: string
}

interface PlainTexts {
  readonly _tag: 'PlainTexts'
  readonly content: ReadonlyArray<Markdown>
}

interface Strikethrough {
  readonly _tag: 'Strikethrough'
  readonly content: Markdown
}

/** @internal */
export const createBold = (content: Markdown): Markdown => ({
  _tag: 'Bold',
  content
})

/** @internal */
export const createFence = (language: string, content: Markdown): Markdown => ({
  _tag: 'Fence',
  language,
  content
})

/** @internal */
export const createHeader =
  (level: number) =>
  (content: Markdown): Markdown => ({
    _tag: 'Header',
    level,
    content
  })

/** @internal */
export const Newline: Markdown = {
  _tag: 'Newline'
}

/** @internal */
export const createParagraph = (...contents: ReadonlyArray<Markdown>): Markdown => ({
  _tag: 'Paragraph',
  content: monoidMarkdown.combineAll(contents)
})

/** @internal */
export const createPlainText = (content: string): Markdown => ({
  _tag: 'PlainText',
  content
})

/** @internal */
export const createPlainTexts = (content: ReadonlyArray<Markdown>): Markdown => ({
  _tag: 'PlainTexts',
  content
})

/** @internal */
export const createStrikethrough = (content: Markdown): Markdown => ({
  _tag: 'Strikethrough',
  content
})

const isEmpty = (markdown: Markdown) => markdown._tag === 'PlainText' && markdown.content === ''

/** @internal */
export const monoidMarkdown: Monoid.Monoid<Markdown> = Monoid.fromSemigroup(
  Semigroup.make((x, y) => (isEmpty(x) ? y : isEmpty(y) ? x : createPlainTexts([x, y]))),
  createPlainText('')
)

/** @internal */
export const match =
  <R>(patterns: {
    readonly Bold: (content: Markdown) => R
    readonly Fence: (language: string, content: Markdown) => R
    readonly Header: (level: number, content: Markdown) => R
    readonly Newline: () => R
    readonly Paragraph: (content: Markdown) => R
    readonly PlainText: (content: string) => R
    readonly PlainTexts: (content: ReadonlyArray<Markdown>) => R
    readonly Strikethrough: (content: Markdown) => R
  }) =>
  (markdown: Markdown): R => {
    switch (markdown._tag) {
      case 'Bold':
        return patterns.Bold(markdown.content)
      case 'Fence':
        return patterns.Fence(markdown.language, markdown.content)
      case 'Header':
        return patterns.Header(markdown.level, markdown.content)
      case 'Newline':
        return patterns.Newline()
      case 'Paragraph':
        return patterns.Paragraph(markdown.content)
      case 'PlainText':
        return patterns.PlainText(markdown.content)
      case 'PlainTexts':
        return patterns.PlainTexts(markdown.content)
      case 'Strikethrough':
        return patterns.Strikethrough(markdown.content)
    }
  }

const CRLF: Markdown = createPlainTexts(ReadonlyArray.replicate(Newline, 2))

const intercalateCRLF: (xs: ReadonlyArray<Markdown>) => Markdown = ReadonlyArray.intercalate(monoidMarkdown)(CRLF)

const h1 = createHeader(1)

const h2 = createHeader(2)

const h3 = createHeader(3)

const ts = (code: string) => createFence('ts', createPlainText(code))

const getSince: (v: Option.Option<string>) => Markdown = Option.match(
  () => monoidMarkdown.empty,
  (v) => monoidMarkdown.combineAll([CRLF, createPlainText(`Added in v${v}`)])
)

const getTitle = (s: string, deprecated: boolean, type?: string): Markdown => {
  const title = s.trim() === 'hasOwnProperty' ? `${s} (function)` : s
  const markdownTitle = deprecated ? createStrikethrough(createPlainText(title)) : createPlainText(title)
  return pipe(
    Option.fromNullable(type),
    Option.match(
      () => markdownTitle,
      (t) => monoidMarkdown.combineAll([markdownTitle, createPlainText(` ${t}`)])
    )
  )
}

const getDescription: (d: Option.Option<string>) => Markdown = flow(
  Option.match(() => monoidMarkdown.empty, createPlainText),
  createParagraph
)

const getSignature = (s: string): Markdown =>
  pipe(
    ReadonlyArray.of(ts(s)),
    ReadonlyArray.prepend(createParagraph(createBold(createPlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const getSignatures = (ss: ReadonlyArray<string>): Markdown =>
  pipe(
    ReadonlyArray.of(ts(ss.join('\n'))),
    ReadonlyArray.prepend(createParagraph(createBold(createPlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const getExamples: (es: ReadonlyArray<string>) => Markdown = flow(
  ReadonlyArray.map((code) =>
    pipe(ReadonlyArray.of(ts(code)), ReadonlyArray.prepend(createBold(createPlainText('Example'))), intercalateCRLF)
  ),
  intercalateCRLF
)

const getStaticMethod = (m: Module.Method): Markdown =>
  createParagraph(
    h3(getTitle(m.name, m.deprecated, '(static method)')),
    getDescription(m.description),
    getSignatures(m.signatures),
    getExamples(m.examples),
    getSince(m.since)
  )

const getMethod = (m: Module.Method): Markdown =>
  createParagraph(
    h3(getTitle(m.name, m.deprecated, '(method)')),
    getDescription(m.description),
    getSignatures(m.signatures),
    getExamples(m.examples),
    getSince(m.since)
  )

const getProperty = (p: Module.Property): Markdown =>
  createParagraph(
    h3(getTitle(p.name, p.deprecated, '(property)')),
    getDescription(p.description),
    getSignature(p.signature),
    getExamples(p.examples),
    getSince(p.since)
  )

const getStaticMethods: (ms: ReadonlyArray<Module.Method>) => Markdown = flow(
  ReadonlyArray.map(getStaticMethod),
  intercalateCRLF
)

const getMethods: (methods: ReadonlyArray<Module.Method>) => Markdown = flow(
  ReadonlyArray.map(getMethod),
  intercalateCRLF
)

const getProperties: (properties: ReadonlyArray<Module.Property>) => Markdown = flow(
  ReadonlyArray.map(getProperty),
  intercalateCRLF
)

const getModuleDescription = (module: Module.Module): Markdown =>
  createParagraph(
    createParagraph(h2(getTitle(module.name, module.deprecated, 'overview'))),
    getDescription(module.description),
    getExamples(module.examples),
    getSince(module.since)
  )

const getMeta = (title: string, order: number): Markdown =>
  createParagraph(
    createPlainText('---'),
    Newline,
    createPlainText(`title: ${title}`),
    Newline,
    createPlainText(`nav_order: ${order}`),
    Newline,
    createPlainText(`parent: Modules`),
    Newline,
    createPlainText('---')
  )

const fromClass = (c: Module.Class): Markdown =>
  createParagraph(
    createParagraph(
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

const fromConstant = (c: Module.Constant): Markdown =>
  createParagraph(
    h2(getTitle(c.name, c.deprecated)),
    getDescription(c.description),
    getSignature(c.signature),
    getExamples(c.examples),
    getSince(c.since)
  )

const fromExport = (e: Module.Export): Markdown =>
  createParagraph(
    h2(getTitle(e.name, e.deprecated)),
    getDescription(e.description),
    getSignature(e.signature),
    getExamples(e.examples),
    getSince(e.since)
  )

const fromFunction = (f: Module.Function): Markdown =>
  createParagraph(
    h2(getTitle(f.name, f.deprecated)),
    getDescription(f.description),
    getSignatures(f.signatures),
    getExamples(f.examples),
    getSince(f.since)
  )

const fromInterface = (i: Module.Interface): Markdown =>
  createParagraph(
    h2(getTitle(i.name, i.deprecated, '(interface)')),
    getDescription(i.description),
    getSignature(i.signature),
    getExamples(i.examples),
    getSince(i.since)
  )

const fromTypeAlias = (ta: Module.TypeAlias): Markdown =>
  createParagraph(
    h2(getTitle(ta.name, ta.deprecated, '(type alias)')),
    getDescription(ta.description),
    getSignature(ta.signature),
    getExamples(ta.examples),
    getSince(ta.since)
  )

/** @internal */
export const fromPrintable = (p: Printable): Markdown => {
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

const getPrintables = (module: Module.Module): ReadonlyArray<Printable> =>
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
export const printModule = (module: Module.Module, order: number): string => {
  const DEFAULT_CATEGORY = 'utils'

  const header = render(getMeta(module.path.slice(1).join('/'), order))

  const description = render(createParagraph(getModuleDescription(module)))

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
        h1(createPlainText(category)),
        ...pipe(
          printables,
          ReadonlyArray.sort(Order.contramap(String.Order, (printable: Printable) => printable.name)),
          ReadonlyArray.map(fromPrintable)
        )
      ]
        .map(render)
        .join('\n')
    )
  ).join('\n')

  const tableOfContents = (content: string) =>
    '<h2 class="text-delta">Table of contents</h2>\n\n' + toc(content).content + '\n\n'

  return prettify([header, description, '---\n', tableOfContents(content), '---\n', content].join('\n'))
}

const bold = (s: string) => `**${s}**`

const header = (level: number, content: string) => `\n${'#'.repeat(level)} ${content}\n\n`

const fence = (language: string, content: string) => '```' + language + '\n' + content + '\n' + '```\n\n'

const paragraph = (content: string) => '\n' + content + '\n\n'

const strikethrough = (content: string) => `~~${content}~~`

/** @internal */
export const render: (markdown: Markdown) => string = match({
  Bold: (content) => bold(render(content)),
  Header: (level, content) => header(level, render(content)),
  Fence: (language, content) => fence(language, render(content)),
  Newline: () => '\n',
  Paragraph: (content) => paragraph(render(content)),
  PlainText: (content) => content,
  PlainTexts: ReadonlyArray.combineMap(String.Monoid)((markdown) => render(markdown)),
  Strikethrough: (content) => strikethrough(render(content))
})

const defaultPrettierOptions: Prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

/** @internal */
export const prettify = (s: string): string => Prettier.format(s, defaultPrettierOptions)
