import * as M from 'fp-ts/Monoid';
import { Semigroup } from 'fp-ts/Semigroup';
import { Show } from 'fp-ts/Show';
import { Class, Constant, Export, Function, Interface, Module, TypeAlias } from './Module';
/**
 * @category model
 * @since 0.6.0
 */
export type Printable = Class | Constant | Export | Function | Interface | TypeAlias;
/**
 * @category model
 * @since 0.6.0
 */
export type Markdown = Bold | Fence | Header | Newline | Paragraph | PlainText | PlainTexts | Strikethrough;
/**
 * @category model
 * @since 0.6.0
 */
export interface Bold {
    readonly _tag: 'Bold';
    readonly content: Markdown;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Fence {
    readonly _tag: 'Fence';
    readonly language: string;
    readonly content: Markdown;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Header {
    readonly _tag: 'Header';
    readonly level: number;
    readonly content: Markdown;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Newline {
    readonly _tag: 'Newline';
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Paragraph {
    readonly _tag: 'Paragraph';
    readonly content: Markdown;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface PlainText {
    readonly _tag: 'PlainText';
    readonly content: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface PlainTexts {
    readonly _tag: 'PlainTexts';
    readonly content: ReadonlyArray<Markdown>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Strikethrough {
    readonly _tag: 'Strikethrough';
    readonly content: Markdown;
}
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Bold: (content: Markdown) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Fence: (language: string, content: Markdown) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Header: (level: number, content: Markdown) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Newline: Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Paragraph: (content: Markdown) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const PlainText: (content: string) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const PlainTexts: (content: ReadonlyArray<Markdown>) => Markdown;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Strikethrough: (content: Markdown) => Markdown;
/**
 * @category destructors
 * @since 0.6.0
 */
export declare const fold: <R>(patterns: {
    readonly Bold: (content: Markdown) => R;
    readonly Fence: (language: string, content: Markdown) => R;
    readonly Header: (level: number, content: Markdown) => R;
    readonly Newline: () => R;
    readonly Paragraph: (content: Markdown) => R;
    readonly PlainText: (content: string) => R;
    readonly PlainTexts: (content: ReadonlyArray<Markdown>) => R;
    readonly Strikethrough: (content: Markdown) => R;
}) => (markdown: Markdown) => R;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printClass: (c: Class) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printConstant: (c: Constant) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printExport: (e: Export) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printFunction: (f: Function) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printInterface: (i: Interface) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printTypeAlias: (f: TypeAlias) => string;
/**
 * @category printers
 * @since 0.6.0
 */
export declare const printModule: (module: Module, order: number) => string;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const semigroupMarkdown: Semigroup<Markdown>;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const monoidMarkdown: M.Monoid<Markdown>;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const showMarkdown: Show<Markdown>;
