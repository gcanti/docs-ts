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

# 0.3.2

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
