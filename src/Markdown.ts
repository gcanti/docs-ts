/**
 * @since 0.9.0
 */
import { absurd, flow, pipe } from '@effect/data/Function'
import * as Option from '@effect/data/Option'
import * as ReadonlyArray from '@effect/data/ReadonlyArray'
import * as ReadonlyRecord from '@effect/data/ReadonlyRecord'
import * as String from '@effect/data/String'
import * as Monoid from '@effect/data/typeclass/Monoid'
import * as Semigroup from '@effect/data/typeclass/Semigroup'
import * as Prettier from 'prettier'

import * as Module from './Module'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const toc = require('markdown-toc')

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.9.0
 */
export type Printable =
  | Module.Class
  | Module.Constant
  | Module.Export
  | Module.Function
  | Module.Interface
  | Module.TypeAlias

/**
 * @category model
 * @since 0.9.0
 */
export type Markdown = Bold | Fence | Header | Newline | Paragraph | PlainText | PlainTexts | Strikethrough

/**
 * @category model
 * @since 0.9.0
 */
export interface Bold {
  readonly _tag: 'Bold'
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Fence {
  readonly _tag: 'Fence'
  readonly language: string
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Header {
  readonly _tag: 'Header'
  readonly level: number
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Newline {
  readonly _tag: 'Newline'
}

/**
 * @category model
 * @since 0.9.0
 */
export interface Paragraph {
  readonly _tag: 'Paragraph'
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.9.0
 */
export interface PlainText {
  readonly _tag: 'PlainText'
  readonly content: string
}

/**
 * @category model
 * @since 0.9.0
 */
export interface PlainTexts {
  readonly _tag: 'PlainTexts'
  readonly content: ReadonlyArray<Markdown>
}
/**
 * @category model
 * @since 0.9.0
 */
export interface Strikethrough {
  readonly _tag: 'Strikethrough'
  readonly content: Markdown
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 0.9.0
 */
export const createBold = (content: Markdown): Markdown => ({
  _tag: 'Bold',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createFence = (language: string, content: Markdown): Markdown => ({
  _tag: 'Fence',
  language,
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createHeader = (level: number, content: Markdown): Markdown => ({
  _tag: 'Header',
  level,
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const Newline: Markdown = {
  _tag: 'Newline'
}

/**
 * @category constructors
 * @since 0.9.0
 */
export const createParagraph = (content: Markdown): Markdown => ({
  _tag: 'Paragraph',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createPlainText = (content: string): Markdown => ({
  _tag: 'PlainText',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createPlainTexts = (content: ReadonlyArray<Markdown>): Markdown => ({
  _tag: 'PlainTexts',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const createStrikethrough = (content: Markdown): Markdown => ({
  _tag: 'Strikethrough',
  content
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.9.0
 */
export const monoidMarkdown: Monoid.Monoid<Markdown> = Monoid.fromSemigroup(
  Semigroup.make((x, y) => createPlainTexts([x, y])),
  createPlainText('')
)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.9.0
 */
export const match = <R>(patterns: {
  readonly Bold: (content: Markdown) => R
  readonly Fence: (language: string, content: Markdown) => R
  readonly Header: (level: number, content: Markdown) => R
  readonly Newline: () => R
  readonly Paragraph: (content: Markdown) => R
  readonly PlainText: (content: string) => R
  readonly PlainTexts: (content: ReadonlyArray<Markdown>) => R
  readonly Strikethrough: (content: Markdown) => R
}): ((markdown: Markdown) => R) => {
  const f = (x: Markdown): R => {
    switch (x._tag) {
      case 'Bold':
        return patterns.Bold(x.content)
      case 'Fence':
        return patterns.Fence(x.language, x.content)
      case 'Header':
        return patterns.Header(x.level, x.content)
      case 'Newline':
        return patterns.Newline()
      case 'Paragraph':
        return patterns.Paragraph(x.content)
      case 'PlainText':
        return patterns.PlainText(x.content)
      case 'PlainTexts':
        return patterns.PlainTexts(x.content)
      case 'Strikethrough':
        return patterns.Strikethrough(x.content)
      default:
        return absurd<R>(x)
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

const CRLF: Markdown = createPlainTexts(ReadonlyArray.replicate(Newline, 2))

const intercalateCRLF: (xs: ReadonlyArray<Markdown>) => Markdown = ReadonlyArray.intercalate(monoidMarkdown)(CRLF)

const intercalateNewline: (xs: ReadonlyArray<string>) => string = ReadonlyArray.intercalate(String.Monoid)('\n')

const h1 = (content: Markdown) => createHeader(1, content)

const h2 = (content: Markdown) => createHeader(2, content)

const h3 = (content: Markdown) => createHeader(3, content)

const ts = (code: string) => createFence('ts', createPlainText(code))

const since: (v: Option.Option<string>) => Markdown = Option.match(
  () => monoidMarkdown.empty,
  (v) => monoidMarkdown.combineAll([CRLF, createPlainText(`Added in v${v}`)])
)

const title = (s: string, deprecated: boolean, type?: string): Markdown => {
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

const description: (d: Option.Option<string>) => Markdown = flow(
  Option.match(() => monoidMarkdown.empty, createPlainText),
  createParagraph
)

const signature = (s: string): Markdown =>
  pipe(
    ReadonlyArray.of(ts(s)),
    ReadonlyArray.prepend(createParagraph(createBold(createPlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const signatures = (ss: ReadonlyArray<string>): Markdown =>
  pipe(
    ReadonlyArray.of(ts(intercalateNewline(ss))),
    ReadonlyArray.prepend(createParagraph(createBold(createPlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const examples: (es: ReadonlyArray<string>) => Markdown = flow(
  ReadonlyArray.map((code) =>
    pipe(ReadonlyArray.of(ts(code)), ReadonlyArray.prepend(createBold(createPlainText('Example'))), intercalateCRLF)
  ),
  intercalateCRLF
)

const staticMethod = (m: Module.Method): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h3(title(m.name, m.deprecated, '(static method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const method = (m: Module.Method): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h3(title(m.name, m.deprecated, '(method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const propertyToMarkdown = (p: Module.Property): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h3(title(p.name, p.deprecated, '(property)')),
      description(p.description),
      signature(p.signature),
      examples(p.examples),
      since(p.since)
    ])
  )

const staticMethods: (ms: ReadonlyArray<Module.Method>) => Markdown = flow(
  ReadonlyArray.map(staticMethod),
  intercalateCRLF
)

const methods: (methods: ReadonlyArray<Module.Method>) => Markdown = flow(ReadonlyArray.map(method), intercalateCRLF)

const properties: (properties: ReadonlyArray<Module.Property>) => Markdown = flow(
  ReadonlyArray.map(propertyToMarkdown),
  intercalateCRLF
)

const moduleDescription = (m: Module.Module): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      createParagraph(h2(title(m.name, m.deprecated, 'overview'))),
      description(m.description),
      examples(m.examples),
      since(m.since)
    ])
  )

const meta = (title: string, order: number): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      createPlainText('---'),
      Newline,
      createPlainText(`title: ${title}`),
      Newline,
      createPlainText(`nav_order: ${order}`),
      Newline,
      createPlainText(`parent: Modules`),
      Newline,
      createPlainText('---')
    ])
  )

const fromClass = (c: Module.Class): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      createParagraph(
        monoidMarkdown.combineAll([
          h2(title(c.name, c.deprecated, '(class)')),
          description(c.description),
          signature(c.signature),
          examples(c.examples),
          since(c.since)
        ])
      ),
      staticMethods(c.staticMethods),
      methods(c.methods),
      properties(c.properties)
    ])
  )

const fromConstant = (c: Module.Constant): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h2(title(c.name, c.deprecated)),
      description(c.description),
      signature(c.signature),
      examples(c.examples),
      since(c.since)
    ])
  )

const fromExport = (e: Module.Export): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h2(title(e.name, e.deprecated)),
      description(e.description),
      signature(e.signature),
      examples(e.examples),
      since(e.since)
    ])
  )

const fromFunction = (f: Module.Function): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h2(title(f.name, f.deprecated)),
      description(f.description),
      signatures(f.signatures),
      examples(f.examples),
      since(f.since)
    ])
  )

const fromInterface = (i: Module.Interface): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h2(title(i.name, i.deprecated, '(interface)')),
      description(i.description),
      signature(i.signature),
      examples(i.examples),
      since(i.since)
    ])
  )

const fromTypeAlias = (ta: Module.TypeAlias): Markdown =>
  createParagraph(
    monoidMarkdown.combineAll([
      h2(title(ta.name, ta.deprecated, '(type alias)')),
      description(ta.description),
      signature(ta.signature),
      examples(ta.examples),
      since(ta.since)
    ])
  )

const fromPrintable = (p: Printable): Markdown => {
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
    default:
      return absurd<Markdown>(p)
  }
}

// -------------------------------------------------------------------------------------
// printers
// -------------------------------------------------------------------------------------

const getPrintables = (module: Module.Module): ReadonlyArray<Printable> =>
  pipe(
    ReadonlyArray.getMonoid<Printable>().combineAll([
      module.classes,
      module.constants,
      module.exports,
      module.functions,
      module.interfaces,
      module.typeAliases
    ])
  )

/**
 * @category printers
 * @since 0.9.0
 */
export const printClass = (c: Module.Class): string => pipe(fromClass(c), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printConstant = (c: Module.Constant): string => pipe(fromConstant(c), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printExport = (e: Module.Export): string => pipe(fromExport(e), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printFunction = (f: Module.Function): string => pipe(fromFunction(f), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printInterface = (i: Module.Interface): string => pipe(fromInterface(i), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printTypeAlias = (f: Module.TypeAlias): string => pipe(fromTypeAlias(f), prettify)

/**
 * @category printers
 * @since 0.9.0
 */
export const printModule = (module: Module.Module, order: number): string => {
  const DEFAULT_CATEGORY = 'utils'

  const header = pipe(meta(module.path.slice(1).join('/'), order), prettify)

  const description = pipe(createParagraph(moduleDescription(module)), prettify)

  const content = pipe(
    getPrintables(module),
    flow(
      ReadonlyArray.groupBy(({ category }) =>
        pipe(
          category,
          Option.getOrElse(() => DEFAULT_CATEGORY)
        )
      ),
      ReadonlyRecord.collect((category, printables) => {
        const title = pipe(h1(createPlainText(category)), prettify)
        const documentation = pipe(
          printables,
          ReadonlyArray.map(flow(fromPrintable, prettify)),
          ReadonlyArray.sort(String.Order),
          intercalateNewline
        )
        return intercalateNewline([title, documentation])
      }),
      ReadonlyArray.sort(String.Order),
      intercalateNewline
    )
  )

  const tableOfContents = (c: string): string =>
    pipe(
      createParagraph(
        monoidMarkdown.combineAll([
          createParagraph(createPlainText('<h2 class="text-delta">Table of contents</h2>')),
          createPlainText(toc(c).content)
        ])
      ),
      prettify
    )

  return pipe(
    intercalateNewline([header, description, '---\n', tableOfContents(content), '---\n', content]),
    prettifyString
  )
}

const prettierOptions: Prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

const canonicalizeMarkdown: (m: ReadonlyArray<Markdown>) => Array<Markdown> = ReadonlyArray.filterMap(
  (markdown: Markdown) =>
    pipe(
      markdown,
      match({
        Bold: () => Option.some(markdown),
        Header: () => Option.some(markdown),
        Fence: () => Option.some(markdown),
        Newline: () => Option.some(markdown),
        Paragraph: () => Option.some(markdown),
        PlainText: (content) => (content.length > 0 ? Option.some(markdown) : Option.none()),
        PlainTexts: (content) => Option.some(createPlainTexts(canonicalizeMarkdown(content))),
        Strikethrough: () => Option.some(markdown)
      })
    )
)

const markdownToString: (markdown: Markdown) => string = match({
  Bold: (content) => String.Monoid.combineAll(['**', markdownToString(content), '**']),
  Header: (level, content) =>
    String.Monoid.combineAll([
      '\n',
      String.Monoid.combineAll(ReadonlyArray.replicate('#', level)),
      ' ',
      markdownToString(content),
      '\n\n'
    ]),
  Fence: (language, content) =>
    String.Monoid.combineAll(['```', language, '\n', markdownToString(content), '\n', '```\n\n']),
  Newline: () => '\n',
  Paragraph: (content) => String.Monoid.combineAll([markdownToString(content), '\n\n']),
  PlainText: (content) => content,
  PlainTexts: (content) =>
    pipe(content, canonicalizeMarkdown, ReadonlyArray.map(markdownToString), String.Monoid.combineAll),
  Strikethrough: (content) => String.Monoid.combineAll(['~~', markdownToString(content), '~~'])
})

const prettifyString = (s: string): string => Prettier.format(s, prettierOptions)

/**
 * @category instances
 * @since 0.9.0
 */
export const prettify = (s: Markdown) => prettifyString(markdownToString(s))
