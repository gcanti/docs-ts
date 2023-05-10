/**
 * @since 0.6.0
 */
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

/**
 * @category model
 * @since 0.6.4
 */
export interface Config {
  readonly projectName: string
  readonly projectHomepage: string
  readonly srcDir: string
  readonly outDir: string
  readonly theme: string
  readonly enableSearch: boolean
  readonly enforceDescriptions: boolean
  readonly enforceExamples: boolean
  readonly enforceVersion: boolean
  readonly exclude: ReadonlyArray<string>
  readonly parseCompilerOptions: Record<string, unknown>
  readonly examplesCompilerOptions: Record<string, unknown>
}

const ConfigDecoder = D.partial<Config>({
  projectName: D.string,
  projectHomepage: D.string,
  srcDir: D.string,
  outDir: D.string,
  theme: D.string,
  enableSearch: D.boolean,
  enforceDescriptions: D.boolean,
  enforceExamples: D.boolean,
  enforceVersion: D.boolean,
  exclude: D.array(D.string),
  parseCompilerOptions: D.UnknownRecord,
  examplesCompilerOptions: D.UnknownRecord
})

/**
 * @since 0.6.4
 */
export const decode = (input: unknown): E.Either<string, Partial<Config>> =>
  pipe(ConfigDecoder.decode(input), E.mapLeft(D.draw))
