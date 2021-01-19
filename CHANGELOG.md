# Changelog

> **Tags:**
>
> - [New Feature]
> - [Bug Fix]
> - [Breaking Change]
> - [Documentation]
> - [Internal]
> - [Polish]
> - [Experimental]

**Note**: Gaps between patch versions are faulty/broken releases.
**Note**: A feature tagged as Experimental is in a high state of flux, you're at risk of it changing without notice.

# 0.6.0

- **Breaking Change**
  - refactor `Markdown` module (@IMax153)
    - add `Markdown` constructors (@IMax153)
    - add tagged union of `Printable` types (@IMax153)
    - add `fold` destructor for `Markdown` (@IMax153)
    - add `Semigroup`, `Monoid`, and `Show` instances for `Markdown` (@IMax153)
    - add `printModule` helper function (@IMax153)
  - update `Parser` module (@IMax153)
    - update the `Env` of `Parser` to inherit from `Settings` (@IMax153)
  - update `Core` module (@IMax153)
    - remove `Eff`, `MonadFileSystem`, and `MonadLog` types (@IMax153)
    - remove `MonadFileSystem` and `MonadLog` instances (@IMax153)
    - add `Program` and `Environment` types (@IMax153)
  - rename `domain` module to `Module` (@IMax153)
    - rename all constructors to match their respective types (@IMax153)

- **New Feature**
  - add `Config` module (@IMax153)
    - support configuration through `docs-ts.json` file (@IMax153)
    - add `Config`, `ConfigBuilder` and `Settings` types (@IMax153)
    - add `build` constructor `ConfigBuilder` (@IMax153)
    - add `resolveSettings` destructor for creating `Settings` from a `ConfigBuilder` (@IMax153)
    - add combinators for manipulating a `ConfigBuilder` (@IMax153)
  - add `FileSystem` module (@IMax153)
    - add `FileSystem` instance (@IMax153)
    - add `File` constructor (@IMax153)
    - add `exists`, `readFile`, `remove`, `search`, and `writeFile` helper functions (@IMax153)
  - add `Logger` module (@IMax153)
    - add `LogEntry`, `LogLevel`, and `Logger` types (@IMax153)
    - add `showEntry` and `Logger` instances (@IMax153)
    - add `debug`, `error`, and `info` helper functions (@IMax153)
  - Add `Example` module (@IMax153)
    - add `run` helper function (@IMax153)

# 0.5.3

- **Polish**
  - add support for TypeScript `4.x`, closes #19 (@gcanti)

# 0.5.2

- **Polish**
  - use ts-node.cmd on windows, #15 (@mattiamanzati)

# 0.5.1

- **Bug Fix**
  - should not return ignore function declarations (@gcanti)
  - should not return internal function declarations (@gcanti)
  - should output the class name when there's an error in a property (@gcanti)

# 0.5.0

- **Breaking Change**
  - total refactoring (@gcanti)

# 0.4.0

- **Breaking Change**
  - the signature snippets are not valid TS (@gcanti)
  - add support for class properties (@gcanti)

# 0.3.5

- **Polish**
  - support any path in `src` in the examples, #12 (@gillchristian)

# 0.3.4

- **Polish**
  - remove `code` from headers (@gcanti)

# 0.3.3

- **Polish**
  - remove useless postfix (@gcanti)

# 0.3.1

- **Bug Fix**
  - add support for default type parameters (@gcanti)

# 0.3.0

- **Breaking Change**
  - modules now can/must be documented as usual (@gcanti)
    - required `@since` tag
    - no more `@file` tags (descriptione can be specified as usual)

# 0.2.1

- **Internal**
  - run `npm audit fix` (@gcanti)

# 0.2.0

- **Breaking Change**
  - replace `ts-simple-ast` with `ts-morph` (@gcanti)
  - make `@since` tag mandatory (@gcanti)
- **New Feature**
  - add support for `ExportDeclaration`s (@gcanti)

# 0.1.0

upgrade to `fp-ts@2.0.0-rc.7` (@gcanti)

- **Bug Fix**
  - fix static methods heading (@gcanti)

# 0.0.3

upgrade to `fp-ts@1.18.x` (@gcanti)

# 0.0.2

- **Bug Fix**
  - fix Windows Path Handling (@rzeigler)

# 0.0.1

Initial release
