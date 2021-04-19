/**
 * Helper functions for using the typescript compiler API
 *
 * @todo separate into what they take as arguments
 */
import { reader as R, readonlyArray as RA } from 'fp-ts'
import { flow, pipe } from 'fp-ts/lib/function'
import * as ast from 'typescript'
import { isExportModifier, isPrivateKeyword, isStaticKeyword } from './modifier'

export function children<N extends ast.Node>(node: N): ReadonlyArray<ast.Node> {
  return node.getChildren()
}

export function forEachChild<N extends ast.Node>(node: N): ReadonlyArray<ast.Node> {
  const fa: Array<ast.Node> = []
  node.forEachChild((node) => fa.push(node))
  return fa
}

export function prop<K extends string>(property: K): <T extends Record<K, unknown>>(fa: T) => T[K] {
  return (fa) => fa[property]
}

export function modifiers<N extends ast.Node>(node: N): ReadonlyArray<ast.Modifier> {
  return node.modifiers || []
}

export function kind<N extends ast.Node>(node: N): ast.SyntaxKind {
  return node.kind
}

export function parent<N extends ast.Node>(node: N): ast.Node {
  return node.parent
}

export const isStatic = <T extends ast.ClassElement>(node: T) => pipe(node, modifiers, RA.some(isStaticKeyword))
export const isPrivate = <T extends ast.ClassElement>(node: T) => pipe(node, modifiers, RA.some(isPrivateKeyword))

export function isExported<N extends ast.Node>(node: N): boolean {
  return pipe(node, forEachChild, RA.some(flow(modifiers, RA.some(isExportModifier))))
}

export const jsDocComments = <N extends ast.Node>(node: N): ReadonlyArray<ast.JSDoc> =>
  pipe(node, forEachChild, RA.chain(children), RA.filter(ast.isJSDoc))

// should this be an ReaderIO?
export function text<T extends ast.TextRange>({ pos, end }: T): R.Reader<ast.SourceFile, string> {
  return (sourceFile) => sourceFile.getFullText().substring(pos, end)
}

export function getTypeParameters<
  N extends Partial<Record<'typeParameters', ast.NodeArray<ast.TypeParameterDeclaration>>>
>(c: N): ReadonlyArray<ast.TypeParameterDeclaration> {
  return c.typeParameters || []
}

export function getConstructors(c: ast.ClassDeclaration) {
  return pipe(c, prop('members'), RA.filter(ast.isConstructorDeclaration))
}
