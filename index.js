import path from 'path';
import files from './src/files.js';
import { ImportsGraph } from './src/graph.js';
import spider from './src/spider.js';
import fs from 'fs';
import log from './src/log.js';
import { ArgumentParser } from 'argparse';
import dot from "./src/dot.js";
import projects from "./src/projects.js";

const runtimeStart = Date.now();
console.log(`Starting spidertank at ${new Date(runtimeStart)}`);

const parser = new ArgumentParser({
  description: 'SpiderTank'
});
parser.add_argument('-e', '--entrypoint', { help: 'Filename which represents the application entrypoint' });
parser.add_argument('-b', '--basedir', { default: null, help: 'Base directory path' });
parser.add_argument('-t', '--target', { default: null, help: 'Target package for spidering paths from the entrypoint' });
parser.add_argument('-c', '--tsconfig', { default: null, help: 'Optional TypeScript config (ex, tsconfig.json)' });
parser.add_argument('-l', '--loglevel', {default: null, help: 'Optional: ERROR, WARN, INFO, or DEBUG'});
parser.add_argument('-nt', '--notransitive', { default: false, help: 'Only spider first-party code' });
parser.add_argument('-p', '--projecttype', {default: null, help: "[js|ts|ang]"})
const args = parser.parse_args();

let argFilename = args.entrypoint;
let argBasePath = args.basedir;
let argTargetPackage = args.target;
let argTsConfig = args.tsconfig;
let projectType;
switch (args.projectType) {
  case 'ts':
    projectType = projects.ProjectTypes.TYPESCRIPT;
    break;
  case 'ang':
    projectType = projects.ProjectTypes.ANGULAR;
    break;
  default:
    projectType = projects.ProjectTypes.JAVASCRIPT;
    break;
};
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

const project = projects.getProject(tsConfigPath);
project.addSourceFilesAtPaths('node_modules');

const workdir = files.resolvePath(basePath);
process.chdir(workdir);

try {
  fs.readFileSync(entrypoint);
} catch (e) {
  log.error(e);
  console.log(`Error: File '${entrypoint}' not found.`);
  process.exit(1);
}

const graph = new ImportsGraph(project, workdir, transitive, projectType);
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