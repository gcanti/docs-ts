import * as ast from 'typescript'

export function isExportModifier(modifier: ast.Modifier): modifier is ast.ExportKeyword {
  return modifier.kind === ast.SyntaxKind.ExportKeyword
}

export function isStaticKeyword(modifier: ast.Modifier): modifier is ast.StaticKeyword {
  return modifier.kind === ast.SyntaxKind.StaticKeyword
}

export function isPrivateKeyword(modifier: ast.Modifier): modifier is ast.PrivateKeyword {
  return modifier.kind === ast.SyntaxKind.PrivateKeyword
}
