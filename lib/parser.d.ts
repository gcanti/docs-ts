import { Option } from 'fp-ts/lib/Option';
import { Forest } from 'fp-ts/lib/Tree';
import { Validation } from 'fp-ts/lib/Validation';
import * as ast from 'ts-simple-ast';
interface Dir {
    [key: string]: Dir;
}
export declare function fromPaths(paths: Array<string>): Dir;
export declare type File = {
    readonly type: 'Directory';
    readonly path: Array<string>;
    readonly children: Array<string>;
} | {
    readonly type: 'File';
    readonly path: Array<string>;
};
export declare function directory(path: Array<string>, children: Array<string>): File;
export declare function file(path: Array<string>): File;
export declare function foldFile<R>(fa: File, onDirectory: (path: Array<string>, children: Array<string>) => R, onFile: (path: Array<string>) => R): R;
export declare function fromDir(dir: Dir): Forest<File>;
export declare function fromPattern(pattern: string): Forest<File>;
export declare function readFileSync(path: string): Validation<Array<string>, string>;
export declare type Location = {
    readonly from: number;
    readonly to: number;
};
export declare function location(from: number, to: number): Location;
export declare type Interface = {
    readonly name: string;
    readonly signature: string;
    readonly description: Option<string>;
    readonly since: Option<string>;
    readonly location: Location;
    readonly deprecated: boolean;
};
export declare function interface_(name: string, signature: string, description: Option<string>, since: Option<string>, location: Location, deprecated: boolean): Interface;
export declare type Func = {
    readonly name: string;
    readonly signature: string;
    readonly description: Option<string>;
    readonly since: Option<string>;
    readonly location: Location;
    readonly deprecated: boolean;
    readonly example: Option<string>;
};
export declare function func(name: string, signature: string, description: Option<string>, since: Option<string>, location: Location, deprecated: boolean, example: Option<string>): Func;
export declare type Method = {
    readonly name: string;
    readonly signature: string;
    readonly description: Option<string>;
    readonly since: Option<string>;
    readonly location: Location;
    readonly deprecated: boolean;
    readonly example: Option<string>;
};
export declare function method(name: string, signature: string, description: Option<string>, since: Option<string>, location: Location, deprecated: boolean, example: Option<string>): Method;
export declare type Class = {
    readonly name: string;
    readonly signature: string;
    readonly description: Option<string>;
    readonly since: Option<string>;
    readonly location: Location;
    readonly deprecated: boolean;
    readonly example: Option<string>;
    readonly methods: Array<Method>;
};
export declare function class_(name: string, signature: string, description: Option<string>, since: Option<string>, location: Location, deprecated: boolean, example: Option<string>, methods: Array<Method>): Class;
export declare type Node = {
    readonly type: 'Index';
    readonly path: Array<string>;
    readonly children: Array<string>;
} | {
    readonly type: 'Module';
    readonly path: Array<string>;
    readonly interfaces: Array<Interface>;
    readonly functions: Array<Func>;
    readonly classes: Array<Class>;
};
export declare function index(path: Array<string>, children: Array<string>): Node;
export declare function module(path: Array<string>, interfaces: Array<Interface>, functions: Array<Func>, classes: Array<Class>): Node;
export declare function fold<R>(fa: Node, onIndex: (path: Array<string>, children: Array<string>) => R, onModule: (path: Array<string>, interfaces: Array<Interface>, functions: Array<Func>, classes: Array<Class>) => R): R;
export declare const monadValidation: import("fp-ts/lib/Monad").Monad2C<"Validation", string[]>;
export declare function fromForest(forest: Forest<File>): Validation<Array<string>, Forest<Node>>;
export declare function run(pattern: string): Validation<Array<string>, Forest<Node>>;
export declare function getSourceFile(name: string, source: string): ast.SourceFile;
export declare function getModuleName(p: Array<string>): string;
export declare function getInterfaces(sourceFile: ast.SourceFile): Validation<Array<string>, Array<Interface>>;
export declare function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Validation<Array<string>, Array<Func>>;
export declare function getClasses(moduleName: string, sourceFile: ast.SourceFile): Validation<Array<string>, Array<Class>>;
export declare function parse(file: File, source: string): Validation<Array<string>, Node>;
export {};
