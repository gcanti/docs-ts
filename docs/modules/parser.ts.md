---
title: parser.ts
nav_order: 6
parent: Modules
---

# parser overview

parser utilities

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [Comment (interface)](#comment-interface)
- [File (interface)](#file-interface)
- [Parser (type alias)](#parser-type-alias)
- [getClasses](#getclasses)
- [getConstants](#getconstants)
- [getExports](#getexports)
- [getFunctions](#getfunctions)
- [getInterfaces](#getinterfaces)
- [getModuleDocumentation](#getmoduledocumentation)
- [getTypeAliases](#gettypealiases)
- [parseComment](#parsecomment)
- [run](#run)

---

# Comment (interface)

**Signature**

```ts
export interface Comment {
  readonly description: O.Option<string>
  readonly tags: Record<string, O.Option<string>>
}
```

Added in v0.5.0

# File (interface)

**Signature**

```ts
export interface File {
  path: string
  content: string
}
```

Added in v0.2.0

# Parser (type alias)

**Signature**

```ts
export type Parser<A> = E.Either<Array<string>, A>
```

Added in v0.2.0

# getClasses

**Signature**

```ts
export declare function getClasses(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Class>>
```

Added in v0.2.0

# getConstants

**Signature**

```ts
export declare function getConstants(sourceFile: ast.SourceFile): Parser<Array<Constant>>
```

Added in v0.2.0

# getExports

**Signature**

```ts
export declare function getExports(sourceFile: ast.SourceFile): Parser<Array<Export>>
```

Added in v0.2.0

# getFunctions

**Signature**

```ts
export declare function getFunctions(moduleName: string, sourceFile: ast.SourceFile): Parser<Array<Function>>
```

Added in v0.2.0

# getInterfaces

**Signature**

```ts
export declare function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>>
```

Added in v0.2.0

# getModuleDocumentation

**Signature**

```ts
export declare function getModuleDocumentation(sourceFile: ast.SourceFile, name: string): Parser<Documentable>
```

Added in v0.2.0

# getTypeAliases

**Signature**

```ts
export declare function getTypeAliases(sourceFile: ast.SourceFile): Parser<Array<TypeAlias>>
```

Added in v0.2.0

# parseComment

**Signature**

```ts
export declare const parseComment: (text: string) => Comment
```

Added in v0.5.0

# run

**Signature**

```ts
export declare function run(files: Array<File>): Parser<Array<Module>>
```

Added in v0.2.0
