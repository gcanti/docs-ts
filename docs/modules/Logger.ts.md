---
title: Logger.ts
nav_order: 5
parent: Modules
---
## Logger overview

Added in v0.6.0
---

<h2 class="text-delta">Table of contents</h2>

- [instances](#instances)
  - [Logger](#logger)
  - [showEntry](#showentry)
- [model](#model)
  - [LogEntry (interface)](#logentry-interface)
  - [LogLevel (type alias)](#loglevel-type-alias)
  - [Logger (interface)](#logger-interface)
- [utils](#utils)
  - [debug](#debug)
  - [error](#error)
  - [info](#info)
---

# instances
## Logger

**Signature**

```ts
export declare const Logger: Logger
```

Added in v0.6.0
## showEntry

**Signature**

```ts
export declare const showEntry: S.Show<LogEntry>
```

Added in v0.6.0
# model
## LogEntry (interface)

**Signature**

```ts
export interface LogEntry {
  readonly message: string
  readonly date: Date
  readonly level: LogLevel
}
```

Added in v0.6.0
## LogLevel (type alias)

**Signature**

```ts
export type LogLevel = 'DEBUG' | 'ERROR' | 'INFO'
```

Added in v0.6.0
## Logger (interface)

**Signature**

```ts
export interface Logger {
  readonly debug: (message: string) => TE.TaskEither<string, void>
  readonly error: (message: string) => TE.TaskEither<string, void>
  readonly info: (message: string) => TE.TaskEither<string, void>
}
```

Added in v0.6.0
# utils
## debug

**Signature**

```ts
export declare const debug: (message: string) => T.Task<void>
```

Added in v0.6.0
## error

**Signature**

```ts
export declare const error: (message: string) => T.Task<void>
```

Added in v0.6.0
## info

**Signature**

```ts
export declare const info: (message: string) => T.Task<void>
```

Added in v0.6.0
