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

- [File (interface)](#file-interface)
- [Parser (type alias)](#parser-type-alias)
- [getClasses](#getclasses)
- [getCommentInfo](#getcommentinfo)
- [getConstants](#getconstants)
- [getExports](#getexports)
- [getFunctions](#getfunctions)
- [getInterfaces](#getinterfaces)
- [getJSDocText](#getjsdoctext)
- [getModuleDocumentation](#getmoduledocumentation)
- [getTypeAliases](#gettypealiases)
- [parseComment](#parsecomment)
- [parseFiles](#parsefiles)

---

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
export type Parser<A> = RE.ReaderEither<Env, NEA.NonEmptyArray<string>, A>
```

Added in v0.2.0

# getClasses

**Signature**

```ts
export declare function getClasses(sourceFile: ast.SourceFile): Parser<Array<Class>>
```

Added in v0.2.0

# getCommentInfo

**Signature**

```ts
export declare function getCommentInfo(
  text: string
): {
  description: O.Option<string>
  since: O.Option<string>
  deprecated: boolean
  examples: Array<Example>
}
```

Added in v0.5.0

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
export declare function getFunctions(sourceFile: ast.SourceFile): Parser<Array<Function>>
```

Added in v0.2.0

# getInterfaces

**Signature**

```ts
export declare function getInterfaces(sourceFile: ast.SourceFile): Parser<Array<Interface>>
```

Added in v0.2.0

# getJSDocText

**Signature**

```ts
export declare function getJSDocText(jsdocs: Array<ast.JSDoc>): string
```

Added in v0.5.0

# getModuleDocumentation

**Signature**

```ts
export declare function getModuleDocumentation(sourceFile: ast.SourceFile): Parser<Documentable>
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

# parseFiles

**Signature**

```ts
export declare function parseFiles(files: Array<File>): E.Either<NEA.NonEmptyArray<string>, Array<Module>>
```

Added in v0.5.0
