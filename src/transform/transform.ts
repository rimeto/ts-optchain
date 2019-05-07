/**
 * Copyright (C) 2019-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as ts from 'typescript';

const TSOC_ANY_SYMBOL = 'TSOCAny';
const TSOC_DATA_ACCESSOR_SYMBOL = 'TSOCDataAccessor';
const TSOC_TYPE_SYMBOL = 'TSOCType';

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context) => (file) => visitNodeAndChildren(file, program, context);
}

function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.SourceFile {
  return ts.visitEachChild(
    visitNode(node, program),
    (childNode) => visitNodeAndChildren(childNode, program, context),
    context,
  ) as ts.SourceFile;
}

function visitNode(node: ts.Node, program: ts.Program): ts.Node {
  const typeChecker = program.getTypeChecker();
  if (ts.isCallExpression(node)) {
    // Check if function call expression is an oc chain, e.g.,
    //   oc(x).y.z()
    if (_isValidOCType(typeChecker.typeToTypeNode(typeChecker.getTypeAtLocation(node.expression)))) {
      // We found an OCType data accessor call
      if (!node.arguments.length) {
        // No default value argument: replace CallExpression node with child expression
        return _expandOCExpression(node.expression);
      }

      // Default argument is provided: replace CallExpression with child expression OR default
      return _expandOCExpression(node.expression, node.arguments[0]);
    } else if (node.arguments.length) {
      // Check for a naked oc(x) call
      const callTypeNode = typeChecker.typeToTypeNode(typeChecker.getTypeAtLocation(node));
      if (_isValidOCType(callTypeNode)) {
        // Unwrap oc(x) -> x
        return node.arguments[0];
      }
    }
  } else if (ts.isPropertyAccessExpression(node)) {
    const expressionTypeNode = typeChecker.typeToTypeNode(typeChecker.getTypeAtLocation(node));
    if (_isValidOCType(expressionTypeNode)) {
      // We found an OCType property access expression w/o closing de-reference, e.g.,
      //   oc(x).y.z
      return _expandOCExpression(node);
    }
  }

  return node;
}

function _isValidOCType(node: ts.TypeNode | undefined): boolean {
  if (!node) {
    return false;
  }

  // Check recursively if we're dealing with a union or intersection type
  if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
    return node.types.some((n) => _isValidOCType(n));
  }

  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return (
      node.typeName.escapedText === TSOC_ANY_SYMBOL ||
      node.typeName.escapedText === TSOC_DATA_ACCESSOR_SYMBOL ||
      node.typeName.escapedText === TSOC_TYPE_SYMBOL
    );
  }

  return false;
}

function _expandOCExpression(expression: ts.Expression, defaultExpression?: ts.Expression): ts.Expression {
  // Transform an OC expression from:
  //   oc(a).b[1].c
  // To:
  //   (a != null && a.b != null && a.b[1] != null && a.b[1].c != null) ? a.b[1].c : defaultValue

  let subExpression: ts.Expression | null = null;
  const nodeStack: ts.Expression[] = [];
  const _walkExpression = (n: ts.Expression): void => {
    if (ts.isCallExpression(n)) {
      // Unwrap oc() by extracting first argument
      subExpression = n.arguments[0];
    } else if (ts.isIdentifier(n) || ts.isToken(n)) {
      // Root is a identifier or token (e.g., this)
      subExpression = n;
    } else if (ts.isPropertyAccessExpression(n)) {
      nodeStack.unshift(n.name);
      _walkExpression(n.expression); // Traverse left-hand expression
    } else if (ts.isElementAccessExpression(n) && n.argumentExpression) {
      nodeStack.unshift(n.argumentExpression);
      _walkExpression(n.expression); // Traverse left-hand expression
    } else {
      throw new Error(`Unknown node type: ${n.kind}`);
    }
  };
  _walkExpression(expression);

  if (!subExpression) {
    throw new Error(`Could not find valid root node for ${TSOC_TYPE_SYMBOL} expression: "${expression.getText()}"`);
  }

  let condition: ts.Expression = ts.createBinary(subExpression, ts.SyntaxKind.ExclamationEqualsToken, ts.createNull());
  for (const next of nodeStack) {
    subExpression = ts.isIdentifier(next)
      ? ts.createPropertyAccess(subExpression, next)
      : ts.createElementAccess(subExpression, next);
    condition = ts.createLogicalAnd(
      condition,
      ts.createBinary(subExpression, ts.SyntaxKind.ExclamationEqualsToken, ts.createNull()),
    );
  }
  return ts.createConditional(condition, subExpression, defaultExpression || ts.createIdentifier('undefined'));
}
