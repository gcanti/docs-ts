import * as O from 'fp-ts/Option';
import * as Ord from 'fp-ts/Ord';
/**
 * @category model
 * @since 0.6.0
 */
export interface Module extends Documentable {
    readonly path: ReadonlyArray<string>;
    readonly classes: ReadonlyArray<Class>;
    readonly interfaces: ReadonlyArray<Interface>;
    readonly functions: ReadonlyArray<Function>;
    readonly typeAliases: ReadonlyArray<TypeAlias>;
    readonly constants: ReadonlyArray<Constant>;
    readonly exports: ReadonlyArray<Export>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Documentable {
    readonly name: string;
    readonly description: O.Option<string>;
    readonly since: O.Option<string>;
    readonly deprecated: boolean;
    readonly examples: ReadonlyArray<Example>;
    readonly category: O.Option<string>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Class extends Documentable {
    readonly _tag: 'Class';
    readonly signature: string;
    readonly methods: ReadonlyArray<Method>;
    readonly staticMethods: ReadonlyArray<Method>;
    readonly properties: ReadonlyArray<Property>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Method extends Documentable {
    readonly signatures: ReadonlyArray<string>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Property extends Documentable {
    readonly signature: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Interface extends Documentable {
    readonly _tag: 'Interface';
    readonly signature: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Function extends Documentable {
    readonly _tag: 'Function';
    readonly signatures: ReadonlyArray<string>;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface TypeAlias extends Documentable {
    readonly _tag: 'TypeAlias';
    readonly signature: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Constant extends Documentable {
    readonly _tag: 'Constant';
    readonly signature: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export interface Export extends Documentable {
    readonly _tag: 'Export';
    readonly signature: string;
}
/**
 * @category model
 * @since 0.6.0
 */
export type Example = string;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Documentable: (name: string, description: O.Option<string>, since: O.Option<string>, deprecated: boolean, examples: ReadonlyArray<Example>, category: O.Option<string>) => Documentable;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Module: (documentable: Documentable, path: ReadonlyArray<string>, classes: ReadonlyArray<Class>, interfaces: ReadonlyArray<Interface>, functions: ReadonlyArray<Function>, typeAliases: ReadonlyArray<TypeAlias>, constants: ReadonlyArray<Constant>, exports: ReadonlyArray<Export>) => Module;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Class: (documentable: Documentable, signature: string, methods: ReadonlyArray<Method>, staticMethods: ReadonlyArray<Method>, properties: ReadonlyArray<Property>) => Class;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Constant: (documentable: Documentable, signature: string) => Constant;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Method: (documentable: Documentable, signatures: ReadonlyArray<string>) => Method;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Property: (documentable: Documentable, signature: string) => Property;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Interface: (documentable: Documentable, signature: string) => Interface;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Function: (documentable: Documentable, signatures: ReadonlyArray<string>) => Function;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const TypeAlias: (documentable: Documentable, signature: string) => TypeAlias;
/**
 * @category constructors
 * @since 0.6.0
 */
export declare const Export: (documentable: Documentable, signature: string) => Export;
/**
 * @category instances
 * @since 0.6.0
 */
export declare const ordModule: Ord.Ord<Module>;
