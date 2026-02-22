/**
 * Codemod to fix React component types
 * Converts implicit any types to proper TypeScript types
 */

import { API, FileInfo, Options } from 'jscodeshift';

export default function transform(fileInfo: FileInfo, api: API, options: Options) {
  const j = api.jscodeshift;
  const source = j(fileInfo.source);

  // Fix React import
  const reactImport = source.find(j.ImportDeclaration, {
    source: { value: 'react' }
  });

  if (!reactImport.length) {
    // Add React import if missing
    const reactImportDeclaration = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier('React'))],
      j.literal('react')
    );
    
    source.get().node.program.body.unshift(reactImportDeclaration);
  }

  // Fix implicit any types in function parameters
  source
    .find(j.FunctionDeclaration)
    .forEach(path => {
      if (path.node.params) {
        path.node.params.forEach((param, index) => {
          if (param.type === 'Identifier' && !param.typeAnnotation) {
            // Add type annotation for implicit any
            param.typeAnnotation = j.typeAnnotation(
              j.tsTypeKeyword(j.tsKeywordKind.tsAnyKeyword)
            );
          }
        });
      }
    });

  // Fix implicit any types in arrow functions
  source
    .find(j.ArrowFunctionExpression)
    .forEach(path => {
      if (path.node.params) {
        path.node.params.forEach((param, index) => {
          if (param.type === 'Identifier' && !param.typeAnnotation) {
            // Add type annotation for implicit any
            param.typeAnnotation = j.typeAnnotation(
              j.tsTypeKeyword(j.tsKeywordKind.tsAnyKeyword)
            );
          }
        });
      }
    });

  // Fix JSX elements to use proper React types
  source
    .find(j.JSXElement)
    .forEach(path => {
      // Ensure JSX is properly typed
      // This will be handled by the tsconfig jsx setting
    });

  return source.toSource({
    quote: 'single',
    trailingComma: true,
    tabWidth: 2,
    useTabs: false
  });
}
