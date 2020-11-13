> A simple, opinionated, zero-configuration tool for creating beautiful documentation for TypeScript projects.

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

Using `docs-ts` is as simple as annotating your code with a JSDoc comment. The one opinionated requirement of `docs-ts` is that all modules and their exported functions and classes must be annotated with an `@since` JSDoc tag indicating when that piece of code last received a modification.

`docs-ts` also supports specifying an `@category` JSDoc tag to group associated module exports in the generated documentation. You can also provide examples for your code using an `@example` JSDoc tag. `docs-ts` will also type-check all code annotated with `@example` tags to ensure that you have not made any errors in your sample code.

By default, `docs-ts` will search for files in the `src` directory and will output generated files into a `docs` directory. For information on how to configure `docs-ts`, see the (Configuration)[#configuration] section below.

For example, running `npm run docs-ts` (or `yarn docs-ts`) in the root directory of a project containing the following file in the `src` directory

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
 * sayHello('Test')()
 * // => Hello, Test!
 *
 * @category greetings
 * @since 0.6.0
 */
export const sayHello = (name: string): IO<void> => log(`Hello, ${name}!`)
```

will, by default, produce a `docs` directory containing the following markdown document in the `modules` subfolder

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

`docs-ts` is meant to be a zero-configuration command-line tool for generating documentation for your TypeScript projects. However, there are several configuration settings that can be specified for `docs-ts`. To customize the configuration of `docs-ts`, create a `docs-ts.json` file in the root directory of your project and indicate the custom configuration parameters that the tool should use when generating documentation.

The `docs-ts.json` configuration file adheres to the following interface:

```ts
interface Config {
  readonly srcDir?: string
  readonly outDir?: string
  readonly theme?: string
  readonly enableSearch?: boolean
  readonly enforceDescriptions?: boolean
  readonly enforceExamples?: boolean
  readonly exclude?: ReadonlyArray<string>
}
```

The following table describes each configuration parameter, its purpose, and its default value.

| Parameter           | Description                                                                                               | Default Value              |
|:--------------------|:----------------------------------------------------------------------------------------------------------|:---------------------------|
| srcDir              | The directory in which `docs-ts` will search for TypeScript files to parse.                               | 'src'                      |
| outDir              | The directory to which `docs-ts` will generate its output markdown documents.                             | 'docs'                     |
| theme               | The theme that `docs-ts` will specify should be used for GitHub Docs in the generated `_config.yml` file. | 'pmarsceill/just-the-docs' |
| enableSearch        | Whether or search should be enabled for GitHub Docs in the generated `_config.yml` file.                  | true                       |
| enforceDescriptions | Whether or not descriptions for each export should be required.                                           | false                      |
| enforceExamples     | Whether or not `@example`s for each export should be required.                                            | false                      |
| exclude             | An array of glob strings specifying files that should be excluded from the documentation.                 | []                         |

## Documentation

- [Docs](https://gcanti.github.io/docs-ts)

## License

The MIT License (MIT)