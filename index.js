import { Project } from 'ts-morph';
import path from 'path';
import { resolvePath } from './src/files.js';
import { ImportsGraph } from './src/graph.js';
import spider from './src/spider.js';
import fs from 'fs';
import log from './src/log.js';
import { ArgumentParser } from 'argparse';
import dot from "./src/dot.js"

const runtimeStart = Date.now();
console.log(`Starting spidertank at ${new Date(runtimeStart)}`);

const parser = new ArgumentParser({
  description: 'Argparse example'
});
parser.add_argument('-e', '--entrypoint', { help: 'Filename which represents the application entrypoint' });
parser.add_argument('-b', '--basedir', { default: null, help: 'Base directory path' });
parser.add_argument('-p', '--target', { default: null, help: 'Target package for spidering paths from the entrypoint' });
parser.add_argument('-c', '--tsconfig', { default: null, help: 'Optional TypeScript config (ex, tsconfig.json)' });
parser.add_argument('-l', '--loglevel', {default: null, help: 'Optional: ERROR, WARN, INFO, or DEBUG'});
parser.add_argument('-nt', '--notransitive', { default: false, help: 'Only spider first-party code' });
const args = parser.parse_args();

let argFilename = args.entrypoint;
let argBasePath = args.basedir;
let argTargetPackage = args.target;
let argTsConfig = args.tsconfig;
const transitive = !args.notransitive;

let entrypoint;
let basePath;
if (argBasePath) {
  basePath = argBasePath;
  entrypoint = argFilename.replace(argBasePath, '');
  if (entrypoint[0] === '/') {
    entrypoint = entrypoint.slice(1);
  }
} else {
  basePath = path.dirname(argFilename);
  entrypoint = path.basename(argFilename);
}

let tsConfigPath = ""

if (argTsConfig) 
  tsConfigPath = path.join(basePath, argTsConfig);

const getProject = (tsconfig) => {
  let tsconfigPath;
  if (tsconfig) {
    log.warn('Loading tsconfig file into project. This can take a long time.');
    if (tsconfig[0] === '~') {
      tsconfigPath = path.join(process.env.HOME, tsconfig.slice(1));
    } else {
      tsconfigPath = tsconfig;
    }
    return new Project(
      {tsConfigFilePath: tsconfigPath}
    );
  }
  return new Project();
};

const project = getProject(tsConfigPath);
project.addSourceFilesAtPaths('node_modules');

const workdir = resolvePath(basePath);
process.chdir(workdir);

try {
  fs.readFileSync(entrypoint);
} catch (e) {
  log.error(e);
  console.log(`Error: File '${entrypoint}' not found.`);
  process.exit(1);
}

const graph = new ImportsGraph(project, workdir, transitive);
const importsGraph = graph.traverse(entrypoint);

log.info(JSON.stringify(importsGraph, null, 2));
console.log(`Found ${Object.keys(importsGraph).length} unique paths.`);

console.log(importsGraph[entrypoint]);
console.log(spider.findNodeModuleReferences(importsGraph, argTargetPackage));

console.log('Spidering results...');
let traceResults = spider.tracePaths(importsGraph, entrypoint, argTargetPackage);
console.log(JSON.stringify(traceResults, null, 2));

console.log(dot.arrayToDotDigraph(traceResults, basePath))

console.log('DONE');

const runtimeEnd = Date.now();
const elapsedTimeSeconds = Math.floor((runtimeEnd - runtimeStart) / 1000);
const asMinutes = Math.floor(elapsedTimeSeconds / 60);
const asSeconds = elapsedTimeSeconds % 60;

console.log(`Elapsed time: ${asMinutes}m ${asSeconds}s`);