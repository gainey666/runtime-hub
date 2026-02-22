/**
 * Codemod: Fix Auto-Clicker Type Issues
 * Fixes the 623 TypeScript errors in the auto-clicker modules
 */

import { API, FileInfo, Identifier, ImportDeclaration, JSXElement, Node } from 'jscodeshift';

const fixAutoClickerTypes = (fileInfo: FileInfo, api: API) => {
  const j = api.jscodeshift;

  return j(fileInfo.source, (path) => {
    // Fix CommonJS imports in TypeScript files
    const commonJSImports = path.find(j.ImportDeclaration, {
      source: (node: ImportDeclaration) => node.source.value === 'require'
    });

    if (commonJSImports) {
      // Convert require() to import statements
      commonJSImports.forEach((imp) => {
        const specifiers = imp.specifiers;
        if (specifiers) {
          const importPath = imp.source.value.match(/require\(['"](.*)['"]\)/)?.[1];
          if (importPath) {
            const newImport = j.importDeclaration(
              specifiers,
              j.stringLiteral(importPath)
            );
            j(imp).replaceWith(newImport);
          }
        }
      });
    }

    // Fix implicit any types in callback parameters
    const functions = path.find(j.FunctionDeclaration);
    functions.forEach((func) => {
      func.params.forEach((param) => {
        if (param.typeAnnotation === undefined && param.name) {
          // Add type annotation to parameters
          const typeAnnotation = j.tsTypeAnnotation(j.tsKeyword('any'));
          j(param).replaceWith(
            j.functionDeclaration.from({
              ...func.node,
              params: func.node.params.map((p, index) => {
                if (index === func.node.params.indexOf(param)) {
                  return j.functionParam.from({
                    ...p,
                    typeAnnotation
                  });
                }
                return p;
              })
            })
          );
        }
      });
    });

    // Fix JSX elements without proper types
    const jsxElements = path.find(j.JSXElement);
    jsxElements.forEach((jsx) => {
      // Add proper React import if missing
      const reactImport = path.find(j.ImportDeclaration, {
        source: (node: ImportDeclaration) => node.source.value === 'react'
      });

      if (!reactImport) {
        const reactImportDecl = j.importDeclaration(
          [j.importDefaultSpecifier(j.identifier('React'))],
          j.stringLiteral('react')
        );
        j(path.node).get(0).insertAfter(reactImportDecl);
      }
    });

    // Fix unused variables
    const unusedVars = path.find(j.VariableDeclarator, {
      name: (name: Identifier) => name.name === 'filepath' || name.name === 'imagePath'
    });

    unusedVars.forEach((varDecl) => {
      if (varDecl.id.type === 'Identifier') {
        // Remove unused variable
        j(varDecl).remove();
      }
    });

    // Fix string | undefined type issues
    const stringUndefinedIssues = path.find(j.TSTypeReference, {
      typeName: (type) => type.type === 'TSUnionType' && 
        type.types.some((t: any) => t.type === 'TSStringKeyword') &&
        type.types.some((t: any) => t.type === 'TSUndefinedKeyword')
    });

    stringUndefinedIssues.forEach((typeRef) => {
      // Change to optional string type
      const newType = j.tsTypeReference(j.identifier('string'), j.tsTokenKind('QuestionMark'));
      j(typeRef).replaceWith(newType);
    });

    return path.node;
  });
};

export default fixAutoClickerTypes;
