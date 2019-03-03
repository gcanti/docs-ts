import { Option } from 'fp-ts/lib/Option';
import { Validation } from 'fp-ts/lib/Validation';
import * as ast from 'ts-simple-ast';
export declare type Parser<A> = Validation<Array<string>, A>;
export interface File {
    path: string;
    content: string;
}
export interface Documentable {
    readonly name: string;
    readonly description: Option<string>;
    readonly since: Option<string>;
    readonly deprecated: boolean;
    readonly example: Option<string>;
}
export declare function documentable(name: string, description: Option<string>, since: Option<string>, deprecated: boolean, example: Option<string>): Documentable;
export interface Interface extends Documentable {
    signature: string;
}
export declare function interface_(documentable: Documentable, signature: string): Interface;
export interface Func extends Documentable {
    readonly signatures: Array<string>;
}
export declare function func(documentable: Documentable, signatures: Array<string>): Func;
export interface Method extends Documentable {
    readonly signatures: Array<string>;
}
export declare function method(documentable: Documentable, signatures: Array<string>): Method;
export interface Class extends Documentable {
    readonly signature: string;
    readonly methods: Array<Method>;
    readonly staticMethods: Array<Method>;
}
export declare function class_(documentable: Documentable, signature: string, methods: Array<Method>, staticMethods: Array<Method>): Class;
export interface TypeAlias extends Documentable {
    readonly signature: string;
}
export declare function typeAlias(documentable: Documentable, signature: string): TypeAlias;
export interface Constant extends Documentable {
    readonly signature: string;
}
export declare function constant(documentable: Documentable, signature: string): Constant;
export interface Export extends Documentable {
    readonly signature: string;
}
export declare function export_(documentable: Documentable, signature: string): Export;
export interface Module {
    readonly path: Array<string>;
    readonly description: Option<string>;
    readonly interfaces: Array<Interface>;
    readonly typeAliases: Array<TypeAlias>;
    readonly functions: Array<Func>;
    readonly classes: Array<Class>;
    readonly constants: Array<Constant>;
    readonly exports: Array<Export>;
}
export declare function module(path: Array<string>, description: Option<string>, interfaces: Array<Interface>, typeAliases: Array<TypeAlias>, functions: Array<Func>, classes: Array<Class>, constants: Array<Constant>, exports: Array<Export>): Module;
export declare const monadParser: import("fp-ts/lib/Monad").Monad2C<"Validation", string[]>;
export declare function run(files: Array<File>): Parser<Array<Module>>;
export declare function getSourceFile(name: string, source: string): ast.SourceFile;
export declare function getModuleName(p: Array<string>): string;
export declare function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>>;
export declare function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Func>>;
export declare function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>>;
export declare function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>>;
export declare function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>>;
export declare function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>>;
export declare function getModuleDescription(sourceFile: ast.SourceFile): Option<string>;
export declare function parse(path: Array<string>, source: string): Parser<Module>;
