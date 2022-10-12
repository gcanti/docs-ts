/**
 * @since 0.6.0
 */
import * as Eq from 'fp-ts/Eq'
import * as M from 'fp-ts/Monoid'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as S from 'fp-ts/Semigroup'
import * as T from 'fp-ts/Traced'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as DE from 'io-ts/DecodeError'
import * as FS from 'io-ts/FreeSemigroup'
import * as TD from 'io-ts/TaskDecoder'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 0.6.0
 */
export interface ConfigBuilder extends T.Traced<Config, Settings> {}

/**
 * @category model
 * @since 0.6.4
 */
export interface Config {
  readonly projectHomepage: string
  readonly srcDir: string
  readonly outDir: string
  readonly theme: string
  readonly enableSearch: boolean
  readonly enforceDescriptions: boolean
  readonly enforceExamples: boolean
  readonly enforceVersion: boolean
  readonly exclude: ReadonlyArray<string>
  readonly compilerOptions: Record<string, unknown>
}

/**
 * @category model
 * @since 0.6.0
 */
export interface Settings {
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
  readonly compilerOptions: Record<string, unknown>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

const getMonoidSetting = <A>(empty: A): M.Monoid<A> => ({
  ...S.getLastSemigroup<A>(),
  empty
})

const monoidConfig: M.Monoid<Config> = M.getStructMonoid({
  projectHomepage: getMonoidSetting(''),
  srcDir: getMonoidSetting('src'),
  outDir: getMonoidSetting('docs'),
  theme: getMonoidSetting('pmarsceill/just-the-docs'),
  enableSearch: getMonoidSetting<boolean>(true),
  enforceDescriptions: getMonoidSetting<boolean>(false),
  enforceExamples: getMonoidSetting<boolean>(false),
  enforceVersion: getMonoidSetting<boolean>(true),
  exclude: getMonoidSetting<ReadonlyArray<string>>(RA.empty),
  compilerOptions: getMonoidSetting<Record<string, unknown>>({})
})

const C = T.getComonad(monoidConfig)

/**
 * @category constructors
 * @since 0.6.4
 */
export const build = (projectName: string, projectHomepage: string): ConfigBuilder => (config) => ({
  ...config,
  projectName,
  projectHomepage: config.projectHomepage.length === 0 ? projectHomepage : config.projectHomepage
})

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

/**
 * @category destructors
 * @since 0.6.0
 */
export const resolveSettings: (builder: ConfigBuilder) => Settings = C.extract

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 0.6.4
 */
export const updateProjectHomepage = (projectHomepage: string) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      projectHomepage
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateSourceDir = (srcDir: string) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      srcDir
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateOutDir = (outDir: string) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      outDir
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateTheme = (theme: string) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      theme
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateSearchEnabled = (enableSearch: boolean) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      enableSearch
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateEnforceDescriptions = (enforceDescriptions: boolean) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      enforceDescriptions
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateEnforceExamples = (enforceExamples: boolean) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      enforceExamples
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateEnforceVersion = (enforceVersion: boolean) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      enforceVersion
    })
  )

/**
 * @category combinators
 * @since 0.6.0
 */
export const updateExclusions = (exclude: ReadonlyArray<string>) => (wa: ConfigBuilder): ConfigBuilder =>
  C.extend(wa, (builder) =>
    builder({
      ...monoidConfig.empty,
      exclude
    })
  )

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

const validConfigurationkeys = RR.keys(monoidConfig.empty)
const semigroupError = DE.getSemigroup<string>()
const validation = TE.getTaskValidation(semigroupError)

const decodeValidKeys = (
  record: RR.ReadonlyRecord<string, unknown>
): TE.TaskEither<TD.DecodeError, RR.ReadonlyRecord<string, unknown>> =>
  pipe(
    record,
    RR.traverseWithIndex(validation)((key, value) =>
      RA.elem(Eq.eqString)(key)(validConfigurationkeys)
        ? TE.right(value)
        : TE.left(FS.of(DE.leaf(key, `a valid configuration property`)))
    )
  )
/**
 * @category utils
 * @since 0.6.4
 */
export const decode = (input: unknown): TE.TaskEither<string, Partial<Config>> => {
  const configDecoder = pipe(
    TD.UnknownRecord,
    TD.parse(decodeValidKeys),
    TD.compose(
      TD.partial<Config>({
        projectHomepage: TD.string,
        srcDir: TD.string,
        outDir: TD.string,
        theme: TD.string,
        enableSearch: TD.boolean,
        enforceDescriptions: TD.boolean,
        enforceExamples: TD.boolean,
        enforceVersion: TD.boolean,
        exclude: TD.array(TD.string),
        compilerOptions: TD.UnknownRecord
      })
    )
  )
  return pipe(configDecoder.decode(input), TE.mapLeft(TD.draw))
}
