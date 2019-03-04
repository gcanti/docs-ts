/**
 * @file examples type-checking
 */

// import { catOptions } from 'fp-ts/lib/Array'
import { Option, none, some } from 'fp-ts/lib/Option'
import * as ts from 'typescript'
// const safeEval = require('safe-eval')

export function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program {
  const files: Array<string> = []
  const sourceFiles: Record<string, ts.SourceFile> = {}
  Object.keys(source).forEach(k => {
    files.push(k)
    sourceFiles[k] = ts.createSourceFile(k, source[k], ts.ScriptTarget.Latest)
  })

  const host = ts.createCompilerHost(options)
  const originalGetSourceFile = host.getSourceFile
  host.getSourceFile = (file, languageVersion) => {
    if (sourceFiles.hasOwnProperty(file)) {
      return sourceFiles[file]
    } else {
      return originalGetSourceFile(file, languageVersion)
    }
  }
  return ts.createProgram(files, options, host)
}

export const defaultOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  noImplicitReturns: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noFallthroughCasesInSwitch: true,
  noEmitOnError: false,
  strict: true,
  target: ts.ScriptTarget.ES5,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  forceConsistentCasingInFileNames: true,
  lib: ['lib.es2015.d.ts'],
  noEmit: true
}

// const context = { exports: {}, require: require }

export function evaluate(source: string): Option<unknown> {
  try {
    // safeEval(source, context)
    // tslint:disable-next-line: no-eval
    eval(source)
    return none
  } catch (e) {
    return some(e)
  }
}

export function transpile(source: string, options: ts.CompilerOptions): string {
  return ts.transpileModule(source, {
    compilerOptions: options
  }).outputText
}

export function check(sources: Record<string, string>, options: ts.CompilerOptions): Array<string> {
  const program = getProgram(sources, options)
  const emitResult = program.emit()
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  const errors = allDiagnostics.map(diagnostic => {
    const sourceFile = diagnostic.file!
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start!)
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    return `${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`
  })
  return errors
  // if (errors.length > 0) {
  //   return errors
  // }
  // return catOptions(
  //   Object.keys(sources).map(k => {
  //     const code = transpile(sources[k], options)
  //     return evaluate(code).map(e => `${k}: ${String(e)}`)
  //   })
  // )
}
