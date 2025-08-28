import path from "path"

const tracePaths = (graph, root, target) => {
  // Non-recursive DFS.
  let stack = [{ name: root, ppath: [root] }];
  let paths = [];
  while (stack.length > 0) {
    let { name, ppath } = stack.pop();
    if (name.indexOf(path.join('node_modules', target)) > -1) {
      paths.push(ppath);
      continue;
    }
    let children = graph[name] || [];
    while (children.length) {
      let child = children.pop();
      if (!ppath || !ppath?.includes) continue
      if (!ppath.includes(child)) {
        stack.push({
          name: child,
          ppath: [...ppath, child]
        });
      }
    } 
  }
  return paths;
};

const findNodeModuleReferences = (importsGraph, target) => {
  const targetsFound = [];
  for (const k of Object.keys(importsGraph)) {
    if (k.indexOf(path.join('node_modules', target)) > -1){
      targetsFound.push(k);
    }
  }
  return targetsFound;
};

export default {
  tracePaths: tracePaths,
  findNodeModuleReferences: findNodeModuleReferences
}