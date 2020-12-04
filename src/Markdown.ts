/**
 * @since 0.6.0
 */
import { intercalate } from 'fp-ts/Foldable'
import * as M from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import * as Ord from 'fp-ts/Ord'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import { Semigroup } from 'fp-ts/Semigroup'
import { Show } from 'fp-ts/Show'
import { absurd, flow, pipe, Endomorphism } from 'fp-ts/function'
import * as prettier from 'prettier'
const toc = require('markdown-toc')

import { Class, Constant, Export, Function, Interface, Method, Module, Property, TypeAlias } from './Module'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export type Printable = Class | Constant | Export | Function | Interface | TypeAlias

/**
 * @category model
 * @since 0.6.0
 */
export type Markdown = Bold | Fence | Header | Newline | Paragraph | PlainText | PlainTexts | Strikethrough

/**
 * @category model
 * @since 0.6.0
 */
export interface Bold {
  readonly _tag: 'Bold'
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Fence {
  readonly _tag: 'Fence'
  readonly language: string
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Header {
  readonly _tag: 'Header'
  readonly level: number
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Newline {
  readonly _tag: 'Newline'
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Paragraph {
  readonly _tag: 'Paragraph'
  readonly content: Markdown
}

/**
 * @category model
 * @since 0.6.0
 */
export interface PlainText {
  readonly _tag: 'PlainText'
  readonly content: string
}

/**
 * @category model
 * @since 0.6.0
 */
export interface PlainTexts {
  readonly _tag: 'PlainTexts'
  readonly content: ReadonlyArray<Markdown>
}
/**
 * @category model
 * @since 0.6.0
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
 * @since 0.6.0
 */
export const Bold = (content: Markdown): Markdown => ({
  _tag: 'Bold',
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Fence = (language: string, content: Markdown): Markdown => ({
  _tag: 'Fence',
  language,
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Header = (level: number, content: Markdown): Markdown => ({
  _tag: 'Header',
  level,
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Newline: Markdown = {
  _tag: 'Newline'
}

/**
 * @category constructors
 * @since 0.6.0
 */
export const Paragraph = (content: Markdown): Markdown => ({
  _tag: 'Paragraph',
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const PlainText = (content: string): Markdown => ({
  _tag: 'PlainText',
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const PlainTexts = (content: ReadonlyArray<Markdown>): Markdown => ({
  _tag: 'PlainTexts',
  content
})

/**
 * @category constructors
 * @since 0.6.0
 */
export const Strikethrough = (content: Markdown): Markdown => ({
  _tag: 'Strikethrough',
  content
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.6.0
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

const foldS: (as: ReadonlyArray<string>) => string = M.fold(M.monoidString)

const foldMarkdown = (as: ReadonlyArray<Markdown>): Markdown => pipe(as, M.fold(monoidMarkdown))

const CRLF: Markdown = PlainTexts(RA.replicate(2, Newline))

const intercalateCRLF = (xs: ReadonlyArray<Markdown>): Markdown => intercalate(monoidMarkdown, RA.Foldable)(CRLF, xs)

const intercalateNewline = (xs: ReadonlyArray<string>): string => intercalate(M.monoidString, RA.Foldable)('\n', xs)

const h1 = (content: Markdown) => Header(1, content)

const h2 = (content: Markdown) => Header(2, content)

const h3 = (content: Markdown) => Header(3, content)

const ts = (code: string) => Fence('ts', PlainText(code))

const since: (v: O.Option<string>) => Markdown = O.fold(
  () => monoidMarkdown.empty,
  v => foldMarkdown([CRLF, PlainText(`Added in v${v}`)])
)

const title = (s: string, deprecated: boolean, type?: string): Markdown => {
  const title = s.trim() === 'hasOwnProperty' ? `${s} (function)` : s
  const markdownTitle = deprecated ? Strikethrough(PlainText(title)) : PlainText(title)
  return pipe(
    O.fromNullable(type),
    O.fold(
      () => markdownTitle,
      t => foldMarkdown([markdownTitle, PlainText(` ${t}`)])
    )
  )
}

const description: (d: O.Option<string>) => Markdown = flow(
  O.fold(() => monoidMarkdown.empty, PlainText),
  Paragraph
)

const signature = (s: string): Markdown =>
  pipe(RA.of(ts(s)), RA.cons(Paragraph(Bold(PlainText('Signature')))), foldMarkdown)

const signatures = (ss: ReadonlyArray<string>): Markdown =>
  pipe(RA.of(ts(intercalateNewline(ss))), RA.cons(Paragraph(Bold(PlainText('Signature')))), foldMarkdown)

const examples: (es: ReadonlyArray<string>) => Markdown = flow(
  RA.map(code => pipe(RA.of(ts(code)), RA.cons(Bold(PlainText('Example'))), intercalateCRLF)),
  intercalateCRLF
)

const staticMethod = (m: Method): Markdown =>
  Paragraph(
    foldMarkdown([
      h3(title(m.name, m.deprecated, '(static method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const method = (m: Method): Markdown =>
  Paragraph(
    foldMarkdown([
      h3(title(m.name, m.deprecated, '(method)')),
      description(m.description),
      signatures(m.signatures),
      examples(m.examples),
      since(m.since)
    ])
  )

const propertyToMarkdown = (p: Property): Markdown =>
  Paragraph(
    foldMarkdown([
      h3(title(p.name, p.deprecated, '(property)')),
      description(p.description),
      signature(p.signature),
      examples(p.examples),
      since(p.since)
    ])
  )

const staticMethods: (ms: ReadonlyArray<Method>) => Markdown = flow(RA.map(staticMethod), intercalateCRLF)

const methods: (methods: ReadonlyArray<Method>) => Markdown = flow(RA.map(method), intercalateCRLF)

const properties: (properties: ReadonlyArray<Property>) => Markdown = flow(RA.map(propertyToMarkdown), intercalateCRLF)

const moduleDescription = (m: Module): Markdown =>
  Paragraph(
    foldMarkdown([
      Paragraph(h2(title(m.name, m.deprecated, 'overview'))),
      description(m.description),
      examples(m.examples),
      since(m.since)
    ])
  )

const meta = (title: string, order: number): Markdown =>
  Paragraph(
    foldMarkdown([
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

const fromClass = (c: Class): Markdown =>
  Paragraph(
    foldMarkdown([
      Paragraph(
        foldMarkdown([
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

const fromConstant = (c: Constant): Markdown =>
  Paragraph(
    foldMarkdown([
      h2(title(c.name, c.deprecated)),
      description(c.description),
      signature(c.signature),
      examples(c.examples),
      since(c.since)
    ])
  )

const fromExport = (e: Export): Markdown =>
  Paragraph(
    foldMarkdown([
      h2(title(e.name, e.deprecated)),
      description(e.description),
      signature(e.signature),
      examples(e.examples),
      since(e.since)
    ])
  )

const fromFunction = (f: Function): Markdown =>
  Paragraph(
    foldMarkdown([
      h2(title(f.name, f.deprecated)),
      description(f.description),
      signatures(f.signatures),
      examples(f.examples),
      since(f.since)
    ])
  )

const fromInterface = (i: Interface): Markdown =>
  Paragraph(
    foldMarkdown([
      h2(title(i.name, i.deprecated, '(interface)')),
      description(i.description),
      signature(i.signature),
      examples(i.examples),
      since(i.since)
    ])
  )

const fromTypeAlias = (ta: TypeAlias): Markdown =>
  Paragraph(
    foldMarkdown([
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

const getPrintables = (module: Module): O.Option<RNEA.ReadonlyNonEmptyArray<Printable>> =>
  pipe(
    M.fold(RA.getMonoid<Printable>())([
      module.classes,
      module.constants,
      module.exports,
      module.functions,
      module.interfaces,
      module.typeAliases
    ]),
    RNEA.fromReadonlyArray
  )

/**
 * @category printers
 * @since 0.6.0
 */
export const printClass = (c: Class): string => pipe(fromClass(c), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printConstant = (c: Constant): string => pipe(fromConstant(c), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printExport = (e: Export): string => pipe(fromExport(e), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printFunction = (f: Function): string => pipe(fromFunction(f), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printInterface = (i: Interface): string => pipe(fromInterface(i), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printTypeAlias = (f: TypeAlias): string => pipe(fromTypeAlias(f), showMarkdown.show)

/**
 * @category printers
 * @since 0.6.0
 */
export const printModule = (module: Module, order: number): string => {
  const DEFAULT_CATEGORY = 'utils'

  const header = pipe(meta(module.path.slice(1).join('/'), order), showMarkdown.show)

  const description = pipe(Paragraph(moduleDescription(module)), showMarkdown.show)

  const content = pipe(
    getPrintables(module),
    O.map(
      flow(
        RNEA.groupBy(({ category }) =>
          pipe(
            category,
            O.getOrElse(() => DEFAULT_CATEGORY)
          )
        ),
        RR.collect((category, printables) => {
          const title = pipe(h1(PlainText(category)), showMarkdown.show)
          const documentation = pipe(
            printables,
            RA.map(flow(fromPrintable, showMarkdown.show)),
            RA.sort(Ord.ordString),
            intercalateNewline
          )
          return intercalateNewline([title, documentation])
        }),
        RA.sort(Ord.ordString),
        intercalateNewline
      )
    ),
    O.getOrElse(() => '')
  )

  const tableOfContents = (c: string): string =>
    pipe(
      Paragraph(
        foldMarkdown([Paragraph(PlainText('<h2 class="text-delta">Table of contents</h2>')), PlainText(toc(c).content)])
      ),
      showMarkdown.show
    )

  return pipe(intercalateNewline([header, description, '---\n', tableOfContents(content), '---\n', content]), prettify)
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 0.6.0
 */
export const semigroupMarkdown: Semigroup<Markdown> = {
  concat: (x, y) => PlainTexts([x, y])
}

/**
 * @category instances
 * @since 0.6.0
 */
export const monoidMarkdown: M.Monoid<Markdown> = {
  ...semigroupMarkdown,
  empty: PlainText('')
}

const prettierOptions: prettier.Options = {
  parser: 'markdown',
  semi: false,
  singleQuote: true,
  printWidth: 120
}

const prettify: Endomorphism<string> = s => prettier.format(s, prettierOptions)

const canonicalizeMarkdown: Endomorphism<ReadonlyArray<Markdown>> = RA.filterMap(markdown =>
  pipe(
    markdown,
    fold({
      Bold: () => O.some(markdown),
      Header: () => O.some(markdown),
      Fence: () => O.some(markdown),
      Newline: () => O.some(markdown),
      Paragraph: () => O.some(markdown),
      PlainText: content => (content.length > 0 ? O.some(markdown) : O.none),
      PlainTexts: content => O.some(PlainTexts(canonicalizeMarkdown(content))),
      Strikethrough: () => O.some(markdown)
    })
  )
)

const markdownToString: (markdown: Markdown) => string = fold({
  Bold: content => foldS(['**', markdownToString(content), '**']),
  Header: (level, content) => foldS(['\n', foldS(RA.replicate(level, '#')), ' ', markdownToString(content), '\n\n']),
  Fence: (language, content) => foldS(['```', language, '\n', markdownToString(content), '\n', '```\n\n']),
  Newline: () => '\n',
  Paragraph: content => foldS([markdownToString(content), '\n\n']),
  PlainText: content => content,
  PlainTexts: content => pipe(content, canonicalizeMarkdown, RA.map(markdownToString), foldS),
  Strikethrough: content => foldS(['~~', markdownToString(content), '~~'])
})

/**
 * @category instances
 * @since 0.6.0
 */
export const showMarkdown: Show<Markdown> = {
  show: flow(markdownToString, prettify)
}
