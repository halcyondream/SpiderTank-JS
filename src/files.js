import Module from 'node:module';
import fs from 'fs';
import path from 'path';
import log from './log.js';
import module from 'module';

class BuiltInModuleException extends Error {
  constructor(message) {
    super(message);
    this.name = 'BuiltInModuleException';
  }
}

const require = Module.createRequire(import.meta.url);

const isFile = (filepath) => {
  try {
    return fs.statSync(filepath).isFile();
  } catch (e) {
    console.error(e)
  }
}

const readPackageDotJson = (packageDotJsonPath) => 
  JSON.parse(fs.readFileSync(packageDotJsonPath, 'utf-8'));

const getPathRelativeToFile = (baseFilename, relativeFilename) => {
  const dirname = path.dirname(path.resolve(baseFilename));
  const resolved = path.resolve(dirname, relativeFilename);
  return resolved;
};

const resolvePath = (filepath) => {
  if (filepath[0] === '~') {
    return path.join(process.env.HOME, filepath.slice(1));
  }
  return path.resolve(filepath);
};

const resolveNodeModule = (importName, workdir) => {
  // Resolve node modules. Do not resolve built-ins. 
  const options = workdir ? {paths: [workdir]} : null;
  const resolvedPath = require.resolve(importName, options);
  if (!isFile(resolvedPath))
    if (module.builtinModules.includes(resolvedPath))
      throw new BuiltInModuleException(`${resolvedPath} is a node built-in module.`);
  return resolvedPath;
};

const resolveModuleFromName = (importName, workdir) => {
  try {
    return resolveNodeModule(importName, workdir);
  } catch (e) {
    log.error(e.message);
    try {
      return resolvePath(importName);
    } catch (e) {
      log.error(`Couldn't resolve ${importName} from ${workdir}\n${e}`);
    }
  }
  return null;
};

const getModulePath = (importName, modulePath, workdir, transitive=false) => {
  if (!transitive && modulePath.indexOf('node_modules') >= 0) {
    return null;
  }
  let resolvedPath = '';
  // Try spidering node modules.
  resolve: try {
    resolvedPath = resolveNodeModule(importName, workdir);
    if (resolvedPath === importName) {
      // Edge case: don't spider "core modules."
      resolvedPath = null;
    }
    break resolve;
  } catch (e) {
    log.error(e.message);
    // Try to resolve TypeScript files.
    tsfile: try {
      const dirName = path.dirname(modulePath);
      resolvedPath = path.join(dirName, importName + '.ts');
      if (!fs.existsSync(resolvedPath)) {
        throw new Error();
      }
      break tsfile;
    } catch (e) {
      log.error(e.message);
      // Try to resolve JavaScript files or compiled TS.
      jsfile: try {
        const relativePath = path.join(path.dirname(modulePath), importName);
        resolvedPath = resolveModuleFromName(relativePath, workdir);
        break jsfile;
      } catch (e) {
        log.error(e.message);
        resolvedPath = null;
      }
    }
  }
  if (resolvedPath !== null) {
    if (!fs.existsSync(resolvedPath)) {
      log.error(`Failed to resolve ${importName}`);
    }
  }
  return resolvedPath;
};

const sanitizeStringLiteral = (str) => {
  return str
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace('\t', '')
    .replace(' ', '');
};

export default {
  sanitizeStringLiteral: sanitizeStringLiteral,
  getModulePath: getModulePath,
  resolveModuleFromName: resolveModuleFromName,
  resolveNodeModule: resolveNodeModule,
  resolvePath: resolvePath,
  getPathRelativeToFile: getPathRelativeToFile,
  readPackageDotJson: readPackageDotJson,
  isFile: isFile,
  BuiltInModuleException: BuiltInModuleException
};