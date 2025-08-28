# SpiderTank-JS

This is a prototype. Use at your own risk.

SpiderTank-JS parses imports starting from an entrypoint file and traces
paths leading to a sink package. Direct import parsing is mostly stable.
This should handle JavaScript and TypeScript files. The default behavior
is fundamentally similar to running `madge` with shallow imports, but the
engine is intended to seek all files in all imports, not just those
esposed through direct imports.

While there is some limited capability to parse transitive dependencies,
this is largely a useless exercise on its own. If you really need to 
analyze transitive dependency paths, consider targeting the actual
package, not using their counterparts from `dist/` or `node_modules/`. 

Usage:

```
usage: index.js [-h] [-e ENTRYPOINT] [-b BASEDIR] [-t TARGET] [-c TSCONFIG] [-l LOGLEVEL] [-nt NOTRANSITIVE] [-p PROJECTTYPE]

SpiderTank

optional arguments:
  -h, --help            show this help message and exit
  -e ENTRYPOINT, --entrypoint ENTRYPOINT
                        Filename which represents the application entrypoint
  -b BASEDIR, --basedir BASEDIR
                        Base directory path
  -t TARGET, --target TARGET
                        Target package for spidering paths from the entrypoint
  -c TSCONFIG, --tsconfig TSCONFIG
                        Optional TypeScript config (ex, tsconfig.json)
  -l LOGLEVEL, --loglevel LOGLEVEL
                        Optional: ERROR, WARN, INFO, or DEBUG
  -nt NOTRANSITIVE, --notransitive NOTRANSITIVE
                        Only spider first-party code
  -p PROJECTTYPE, --projecttype PROJECTTYPE
                        [js|ts|ang]
```

Example, using the project itself. Suppose we want to target the
`ts-morph` package, which is directly imported in `package.json`:

```
node index.js -b $(pwd) -t ts-morph -e index.js -nt true -p js
```

Output is given in a few parts. 

*All files resolved*:

```
Found 12 unique paths.
[
  '/Users/rprofessional/Documents/SpiderTank-JS/path',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/files.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/graph.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/spider.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/fs',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/log.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/node_modules/argparse/argparse.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/dot.js',
  '/Users/rprofessional/Documents/SpiderTank-JS/src/projects.js'
]
```

The resolver currently has no awareness of the difference between inbuilt
modules versus other types, so you'll notice `fs` and `path` in the
output. This should be fixed, but it doesn't necessarily impact the main
business logic.

*Nested array of all paths to target*:

```
[
  [
    "index.js",
    "/Users/rprofessional/Documents/SpiderTank-JS/src/graph.js",
    "/Users/rprofessional/Documents/SpiderTank-JS/node_modules/ts-morph/dist/ts-morph.js"
  ],
  [
    "index.js",
    "/Users/rprofessional/Documents/SpiderTank-JS/src/graph.js",
    "/Users/rprofessional/Documents/SpiderTank-JS/src/projects.js",
    "/Users/rprofessional/Documents/SpiderTank-JS/node_modules/ts-morph/dist/ts-morph.js"
  ]
]
```

*GraphViz DOT representation*:

```
strict digraph {
  "index.js" -> "/src/graph.js"
  "/src/graph.js" -> "/node_modules/ts-morph/dist/ts-morph.js"
  "index.js" -> "/src/graph.js"
  "/src/graph.js" -> "/src/projects.js"
  "/src/projects.js" -> "/node_modules/ts-morph/dist/ts-morph.js"
}
```

([And the example used in GraphViz online](https://dreampuf.github.io/GraphvizOnline/?engine=dot#strict%20digraph%20%7B%0A%20%20%22index.js%22%20-%3E%20%22%2Fsrc%2Fgraph.js%22%0A%20%20%22%2Fsrc%2Fgraph.js%22%20-%3E%20%22%2Fnode_modules%2Fts-morph%2Fdist%2Fts-morph.js%22%0A%20%20%22index.js%22%20-%3E%20%22%2Fsrc%2Fgraph.js%22%0A%20%20%22%2Fsrc%2Fgraph.js%22%20-%3E%20%22%2Fsrc%2Fprojects.js%22%0A%20%20%22%2Fsrc%2Fprojects.js%22%20-%3E%20%22%2Fnode_modules%2Fts-morph%2Fdist%2Fts-morph.js%22%0A%7D))