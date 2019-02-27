import * as ts from 'typescript'

export function getProgram(source: Record<string, string>, options: ts.CompilerOptions): ts.Program {
  const host = ts.createCompilerHost(options)
  const originalGetSourceFile = host.getSourceFile
  const files: Array<string> = []
  const sourceFiles: Record<string, ts.SourceFile> = {}
  Object.keys(source).forEach(k => {
    files.push(k)
    sourceFiles[k] = ts.createSourceFile(k, source[k], ts.ScriptTarget.Latest)
  })
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

export interface Failure {
  source: string
  message: string
}

export function checkSources(
  sources: Record<string, string>,
  options: ts.CompilerOptions = defaultOptions
): Array<Failure> {
  const program = getProgram(sources, options)
  const allDiagnostics = ts.getPreEmitDiagnostics(program)
  const failures: Array<Failure> = []
  allDiagnostics.forEach(diagnostic => {
    const sourceFile = diagnostic.file!
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start!)
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    failures.push({
      source: sourceFile.getFullText(),
      message: `${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`
    })
  })
  return failures
}
