import { SyntaxKind } from 'ts-morph';
import files from './files.js'
import log from './log.js';
import path from "path";

class ImportDeclNode {
  constructor(node) {
    if (!node.getKind() === SyntaxKind.ImportDeclaration) {
      throw new Error('Not an ImportDeclaration node.');
    }
    this.node = node;
  }

  getResolvedFilePath(workdir) {
    return files.resolveNodeModule(this.getPackageName(), workdir);
  }
    
  getPackageName() {
    return this.node.getModuleSpecifierValue();
  }

  getDeepFilePath() {
    return this.node
      .getDescendantsOfKind(SyntaxKind.StringLiteral)[0]
      .getSymbol()
      .compilerSymbol
      .getDeclarations()[0]
      .path;
  }

  getPathsFromCompilerOptions(tsProject) {
    return tsProject.getCompilerOptions().paths[this.getPackageName()]
  }
}

class ExportedDeclNode {
  constructor(node) {
    if (!node.getKind() === SyntaxKind.ExportDeclaration) {
      throw new Error('Not an ExportDeclaration type.')
    }
    this.node = node 
  }

  getDeepFilePaths() {
    return Array.from(this.node.getExportedDeclarations().values())
                  .map(a => 
                    a.map(a => 
                      a.compilerNode.symbol.declarations
                        .map(a => a.parent.resolvedPath)
                      )
                    )
                    .flat()
                  .flat()
                  .filter(p => p !== undefined)
  }
}

class CallExpressionNode {
  constructor(node) {
    if (!node.getKind() === SyntaxKind.CallExpression) {
      throw new Error('Not a CallExpression type.');
    }
    this.node = node; 
  }
    
  getIdentifier() {
    const identifier = this.node.getDescendantsOfKind(SyntaxKind.Identifier);
    if (!identifier?.length) {
      return;
    }
    return identifier[0].getText();
  }
    
  getFirstArgument() {
    const descendants = this.node.getChildrenOfKind(SyntaxKind.SyntaxList);
    if (!descendants?.length) {
      return;
    }
    return files.sanitizeStringLiteral(descendants[0].getText());
  }
}

const ProjectTypes = {
  Angular: 1
};

export class ImportsGraph {
  constructor(tsProject, workdir, transitive, projectType=null) {
    this.importsGraph = {};
    this.hasVisited = new Set();
    this.toVisit = [];
    this.tsProject = tsProject;
    this.workdir = workdir;
    this.transitive = transitive;
    this.projectType = ProjectTypes.Angular;
  }

  getTreeFromFile (filename) {
    try {
      return this.tsProject.addSourceFileAtPath(filename);
    } catch (e) {
      log.error(e);
    }
    return null;
  }

  visitCallExpression(node, filepath) {
    const callExprNode = new CallExpressionNode(node);
    if (callExprNode.getIdentifier() !== 'require') {
      return;
    }
    try {
      return files.resolveNodeModule(callExprNode.getFirstArgument(), this.workdir);
    } catch (e) {
      console.error(e);
    }
    try {
      const relativeFilePath = files.getPathRelativeToFile(filepath, callExprNode.getFirstArgument());
      let resolvedModule = files.resolveNodeModule(relativeFilePath);
      if (files.isFile(resolvedModule)) return resolvedModule;      
    } catch (e) {
      log.error(e);
    }
  }

  visitImportDeclaration(node, filepath) {
    const importDeclNode = new ImportDeclNode(node);
    try {
      // Best case: resolves to the target on the filesystem.
      return importDeclNode.getResolvedFilePath(this.workdir);
    } catch (e) {
      log.error(e);
    }
    try {
      // This works for Angular components, etc.
      const resolve = path.resolve(importDeclNode.getDeepFilePath());
      if (resolve.endsWith('.d.ts')) {
        throw new Error(`Passing *.d.ts file: ${resolve}`)
      }
      return resolve;
    } catch (e) {
      log.error(e);
    }
    try {
      // Use case: things in dist/, compiled to ESM or FESM.
      const compilerPaths = importDeclNode.getPathsFromCompilerOptions(this.tsProject);
      const compilerPath = path.resolve(compilerPaths[0])
      if (files.isFile(compilerPath)) return compilerPath
      const packageDotJsonPath = path.join(compilerPath, 'package.json');
      if (!files.isFile(packageDotJsonPath)) return;
      const packageDotJson = files.readPackageDotJson(packageDotJsonPath);
      const exports = packageDotJson?.exports;
      const module = packageDotJson?.module;
      if (!exports && !module) return;
      let defaultExport;
      if (this.projectType == ProjectTypes.Angular) {
        defaultExport = path.join(compilerPath, exports['.'].default)
      }
      if (!files.isFile(defaultExport)) throw new Error("Couldn't resolve ESM/FESM type.");
      return defaultExport;
    } catch (e) {
      log.error(e);
    }
    try {
      // Try to determine the file path. 
      // TODO: Implement file suffix checks as needed.
      return files.getPathRelativeToFile(filepath, importDeclNode.getPackageName());
    } catch (e) {
      log.error(e);
    }
  }

  visitExportDeclarations(node) {
    const exportDeclNode = new ExportedDeclNode(node);
    try {
      return exportDeclNode.getDeepFilePaths();
    } catch (e) {
      log.error(e)
    }
  }

  getImportConnections(filepath) {
    let fileImportSet = new Set();
    let filePath = path.resolve(filepath)
    let root = this.getTreeFromFile(filePath);
    if (root === null) {
      return [];
    }
    const callExpressions = root.getDescendantsOfKind(SyntaxKind.CallExpression);
    const importDecls = root.getDescendantsOfKind(SyntaxKind.ImportDeclaration);
    if (callExpressions?.length) {
      callExpressions
        .map(node => this.visitCallExpression(node))
        .filter(node => node !== undefined)
        .forEach(file => fileImportSet.add(path.resolve(file)))
    }
    if (importDecls?.length){
      importDecls
        .map(node => this.visitImportDeclaration(node, filePath))
        .filter(node => node !== undefined)
        .forEach(file => fileImportSet.add(path.resolve(file)))
    }
    if (root.getExportedDeclarations()?.size) {
      const exportDecls = this.visitExportDeclarations(root);
      if (exportDecls?.length) {
        exportDecls.forEach(e => fileImportSet.add(path.resolve(e)))
      }
    }
    return Array.from(fileImportSet);
  }
    
  traverse_BFS(filename) {
    if (this.hasVisited.has(filename)) {
      return;
    }
    let importFilePaths = this.getImportConnections(filename);
    this.importsGraph[filename] = importFilePaths;
        
    for (const d of importFilePaths) {
      if (!this.hasVisited.has(d) && d !== filename) {
        this.toVisit.push(d);
      }
    }
  }

  traverse(entrypointFilename) {
    this.traverse_BFS(entrypointFilename);
    while (this.toVisit.length) {
      let v = this.toVisit.pop(0);
      this.traverse_BFS(v);
      this.hasVisited.add(v);
    }
    return this.importsGraph;
  }
}


