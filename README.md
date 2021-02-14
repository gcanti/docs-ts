<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of contents**

- [Installation:](#installation)
    - [Via `npm`](#via-npm)
    - [Via `yarn`](#via-yarn)
    - [Via `npx` (on-demand)](#via-npx-on-demand)
- [Why](#why)
- [Usage](#usage)
    - [Supported JSDoc Tags](#supported-jsdoc-tags)
  - [Example](#example)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [FAQ](#faq)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

> A simple, opinionated, zero-configuration tool for creating beautiful documentation for TypeScript projects.

**:warning: DISCLAIMER :warning:**  
`docs-ts` is used primarily as an **opinionated** documentation tool for libraries in the `fp-ts` ecosystem. The structure of source code documentation expected by `docs-ts` can be best understood by reviewing the source code of the [`fp-ts`](https://github.com/gcanti/fp-ts) repository.

## Installation:

#### Via `npm`

```
npm install -D docs-ts
```

#### Via `yarn`

```
yarn add -D docs-ts
```

#### Via `npx` (on-demand)

```
npx docs-ts
```

## Why

Creating and maintaing documentation for a TypeScript project of any size can quickly become a herculean task. `docs-ts` simplifies this process by allowing you to co-locate your documentation with its associated code. You simply annotate your code with JSDoc comments, and then the CLI will generate beautiful markdown documents containing all of the documentation and examples you associated with your code. In addition, the generated output of `docs-ts` can be used as a [publishing source](https://docs.github.com/en/free-pro-team@latest/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#choosing-a-publishing-source) for your repository's documentation on GitHub.

## Usage

Using `docs-ts` is as simple as annotating your code with JSDoc comments. Specialized JSDoc tags can be used to perform various functions, such as grouping associated code together, versioning documentation, and running and testing source code. A full list of supported JSDoc tags can be found below.

#### Supported JSDoc Tags

| Tag           | Description                                                                                                                                                                                                                                                                            | Default   |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------|
| `@category`   | Groups associated module exports together in the generated documentation.                                                                                                                                                                                                              | `'utils'` |
| `@example`    | Allows usage examples to be provided for your source code. All examples are type checked using `ts-node`. Examples are also run using `ts-node` and the NodeJS [assert](https://nodejs.org/api/assert.html) module can be used for on-the-fly testing (see [example](#example) below). |           |
| `@since`      | Allows for documenting most recent library version in which a given piece of source code was updated.                                                                                                                                                                                  |           |
| `@deprecated` | Marks source code as deprecated, which will ~~strikethrough~~ the name of the annotated module or function in the generated documentation.                                                                                                                                             | `false`   |

By default, `docs-ts` will search for files in the `src` directory and will output generated files into a `docs` directory. For information on how to configure `docs-ts`, see the [Configuration](#configuration) section below.

### Example

The best usage examples of `docs-ts` can be found in [`fp-ts` ecosystem](https://gcanti.github.io/fp-ts/ecosystem/) libraries that generate their documentation with `docs-ts`, such as the main [`fp-ts`](https://github.com/gcanti/fp-ts) repository.

To illustrate the power of `docs-ts`, here is a small example. Running `npm run docs-ts` (or `yarn docs-ts`) in the root directory of a project containing the following file in the `src` directory...

```ts
/**
 * @since 0.2.0
 */
import { log } from 'fp-ts/Console'
import { IO } from 'fp-ts/IO'

/**
 * Greets a person by name.
 *
 * @example
 * import { sayHello } from 'docs-ts/lib/greetings'
 *
 * assert.strictEqual(sayHello('Test')(), 'Hello, Test!')
 * // => This assert statement will be run by docs-ts so you can test your code on-the-fly.
 *
 * @category greetings
 * @since 0.6.0
 */
export const sayHello = (name: string): IO<void> => log(`Hello, ${name}!`)
```

...will, by default, produce a `docs` directory containing the following markdown document in the `modules` subfolder.

````md
---
title: greetings.ts
nav_order: 0
parent: Modules
---

## greetings overview

Added in v0.2.0

---

<h2 class="text-delta">Table of contents</h2>

- [greetings](#greetings)
  - [sayHello](#sayhello)

---

# greetings

## sayHello

Greets a person by name.

**Signature**

```ts
export declare const sayHello: (name: string) => IO<void>
```

**Example**

```ts
import { sayHello } from 'docs-ts/lib/greetings'

sayHello('Test')()
// => Hello, Test!
```

Added in v0.6.0
````

## Configuration

`docs-ts` is meant to be a zero-configuration command-line tool by default. However, there are several configuration settings that can be specified for `docs-ts`. To customize the configuration of `docs-ts`, create a `docs-ts.json` file in the root directory of your project and indicate the custom configuration parameters that the tool should use when generating documentation.

The `docs-ts.json` configuration file adheres to the following interface:

```ts
interface Config {
  readonly srcDir?: string
  readonly outDir?: string
  readonly theme?: string
  readonly enableSearch?: boolean
  readonly enforceDescriptions?: boolean
  readonly enforceExamples?: boolean
  readonly enforceVersion?: boolean
  readonly exclude?: ReadonlyArray<string>
}
```

The following table describes each configuration parameter, its purpose, and its default value.

| Parameter           | Description                                                                                               | Default Value                |
|:--------------------|:----------------------------------------------------------------------------------------------------------|:-----------------------------|
| srcDir              | The directory in which `docs-ts` will search for TypeScript files to parse.                               | `'src'`                      |
| outDir              | The directory to which `docs-ts` will generate its output markdown documents.                             | `'docs'`                     |
| theme               | The theme that `docs-ts` will specify should be used for GitHub Docs in the generated `_config.yml` file. | `'pmarsceill/just-the-docs'` |
| enableSearch        | Whether or search should be enabled for GitHub Docs in the generated `_config.yml` file.                  | `true`                       |
| enforceDescriptions | Whether or not descriptions for each module export should be required.                                    | `false`                      |
| enforceExamples     | Whether or not `@example` tags for each module export should be required.                                 | `false`                      |
| enforceVersion      | Whether or not `@since` tags for each module export should be required.                                   | `true`                       |
| exclude             | An array of glob strings specifying files that should be excluded from the documentation.                 | `[]`                         |

## Documentation

- [Docs](https://gcanti.github.io/docs-ts)

## FAQ

**Q:** For functions that have overloaded definitions, is it possible to document each overload separately?

**A:** No, `docs-ts` will use the documentation provided for the first overload of a function in its generated output.

## License

The MIT License (MIT)
