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
import * as prettier from 'prettier'

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
export const Bold = (content: Markdown): Markdown => ({
  _tag: 'Bold',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const Fence = (language: string, content: Markdown): Markdown => ({
  _tag: 'Fence',
  language,
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const Header = (level: number, content: Markdown): Markdown => ({
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
export const Paragraph = (content: Markdown): Markdown => ({
  _tag: 'Paragraph',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const PlainText = (content: string): Markdown => ({
  _tag: 'PlainText',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const PlainTexts = (content: ReadonlyArray<Markdown>): Markdown => ({
  _tag: 'PlainTexts',
  content
})

/**
 * @category constructors
 * @since 0.9.0
 */
export const Strikethrough = (content: Markdown): Markdown => ({
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
  Semigroup.make((x, y) => PlainTexts([x, y])),
  PlainText('')
)

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.9.0
 */
export const fold = <R>(patterns: {
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

const CRLF: Markdown = PlainTexts(ReadonlyArray.replicate(Newline, 2))

const intercalateCRLF: (xs: ReadonlyArray<Markdown>) => Markdown = ReadonlyArray.intercalate(monoidMarkdown)(CRLF)

const intercalateNewline: (xs: ReadonlyArray<string>) => string = ReadonlyArray.intercalate(String.Monoid)('\n')

const h1 = (content: Markdown) => Header(1, content)

const h2 = (content: Markdown) => Header(2, content)

const h3 = (content: Markdown) => Header(3, content)

const ts = (code: string) => Fence('ts', PlainText(code))

const since: (v: Option.Option<string>) => Markdown = Option.match(
  () => monoidMarkdown.empty,
  (v) => monoidMarkdown.combineAll([CRLF, PlainText(`Added in v${v}`)])
)

const title = (s: string, deprecated: boolean, type?: string): Markdown => {
  const title = s.trim() === 'hasOwnProperty' ? `${s} (function)` : s
  const markdownTitle = deprecated ? Strikethrough(PlainText(title)) : PlainText(title)
  return pipe(
    Option.fromNullable(type),
    Option.match(
      () => markdownTitle,
      (t) => monoidMarkdown.combineAll([markdownTitle, PlainText(` ${t}`)])
    )
  )
}

const description: (d: Option.Option<string>) => Markdown = flow(
  Option.match(() => monoidMarkdown.empty, PlainText),
  Paragraph
)

const signature = (s: string): Markdown =>
  pipe(
    ReadonlyArray.of(ts(s)),
    ReadonlyArray.prepend(Paragraph(Bold(PlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const signatures = (ss: ReadonlyArray<string>): Markdown =>
  pipe(
    ReadonlyArray.of(ts(intercalateNewline(ss))),
    ReadonlyArray.prepend(Paragraph(Bold(PlainText('Signature')))),
    monoidMarkdown.combineAll
  )

const examples: (es: ReadonlyArray<string>) => Markdown = flow(
  ReadonlyArray.map((code) =>
    pipe(ReadonlyArray.of(ts(code)), ReadonlyArray.prepend(Bold(PlainText('Example'))), intercalateCRLF)
  ),
  intercalateCRLF
)

const staticMethod = (m: Module.Method): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      h3(title(m.name, m.deprecated, '(static method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const method = (m: Module.Method): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      h3(title(m.name, m.deprecated, '(method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const propertyToMarkdown = (p: Module.Property): Markdown =>
  Paragraph(
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
  Paragraph(
    monoidMarkdown.combineAll([
      Paragraph(h2(title(m.name, m.deprecated, 'overview'))),
      description(m.description),
      examples(m.examples),
      since(m.since)
    ])
  )

const meta = (title: string, order: number): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      PlainText('---'),
      Newline,
      PlainText(`title: ${title}`),
      Newline,
      PlainText(`nav_order: ${order}`),
      Newline,
      PlainText(`parent: Modules`),
      Newline,
      PlainText('---')
    ])
  )

const fromClass = (c: Module.Class): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      Paragraph(
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
  Paragraph(
    monoidMarkdown.combineAll([
      h2(title(c.name, c.deprecated)),
      description(c.description),
      signature(c.signature),
      examples(c.examples),
      since(c.since)
    ])
  )

const fromExport = (e: Module.Export): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      h2(title(e.name, e.deprecated)),
      description(e.description),
      signature(e.signature),
      examples(e.examples),
      since(e.since)
    ])
  )

const fromFunction = (f: Module.Function): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      h2(title(f.name, f.deprecated)),
      description(f.description),
      signatures(f.signatures),
      examples(f.examples),
      since(f.since)
    ])
  )

const fromInterface = (i: Module.Interface): Markdown =>
  Paragraph(
    monoidMarkdown.combineAll([
      h2(title(i.name, i.deprecated, '(interface)')),
      description(i.description),
      signature(i.signature),
      examples(i.examples),
      since(i.since)
    ])
  )

const fromTypeAlias = (ta: Module.TypeAlias): Markdown =>
  Paragraph(
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
export const printClass = (c: Module.Class): string => pipe(fromClass(c), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printConstant = (c: Module.Constant): string => pipe(fromConstant(c), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printExport = (e: Module.Export): string => pipe(fromExport(e), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printFunction = (f: Module.Function): string => pipe(fromFunction(f), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printInterface = (i: Module.Interface): string => pipe(fromInterface(i), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printTypeAlias = (f: Module.TypeAlias): string => pipe(fromTypeAlias(f), showMarkdown)

/**
 * @category printers
 * @since 0.9.0
 */
export const printModule = (module: Module.Module, order: number): string => {
  const DEFAULT_CATEGORY = 'utils'

  const header = pipe(meta(module.path.slice(1).join('/'), order), showMarkdown)

  const description = pipe(Paragraph(moduleDescription(module)), showMarkdown)

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
        const title = pipe(h1(PlainText(category)), showMarkdown)
        const documentation = pipe(
          printables,
          ReadonlyArray.map(flow(fromPrintable, showMarkdown)),
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
      Paragraph(
        monoidMarkdown.combineAll([
          Paragraph(PlainText('<h2 class="text-delta">Table of contents</h2>')),
          PlainText(toc(c).content)
        ])
      ),
      showMarkdown
    )

  return pipe(intercalateNewline([header, description, '---\n', tableOfContents(content), '---\n', content]), prettify)
}

const prettierOptions: prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

const prettify = (s: string): string => prettier.format(s, prettierOptions)

const canonicalizeMarkdown: (m: ReadonlyArray<Markdown>) => Array<Markdown> = ReadonlyArray.filterMap(
  (markdown: Markdown) =>
    pipe(
      markdown,
      fold({
        Bold: () => Option.some(markdown),
        Header: () => Option.some(markdown),
        Fence: () => Option.some(markdown),
        Newline: () => Option.some(markdown),
        Paragraph: () => Option.some(markdown),
        PlainText: (content) => (content.length > 0 ? Option.some(markdown) : Option.none()),
        PlainTexts: (content) => Option.some(PlainTexts(canonicalizeMarkdown(content))),
        Strikethrough: () => Option.some(markdown)
      })
    )
)

const markdownToString: (markdown: Markdown) => string = fold({
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

/**
 * @category instances
 * @since 0.9.0
 */
export const showMarkdown = flow(markdownToString, prettify)
