export default {
    arrayToDotDigraph: (nestedArray, basePath) => {
        // Expects a two-dimensional "array of arrays."
        let digraph = "strict digraph {\n";
        for (let paths of nestedArray) {
            let i = 0;
            let len = paths.length - 1;
            while (i < len) {
                let n1 = paths[i].replace(basePath, '');
                let n2 = paths[i+1].replace(basePath, '');
                digraph += `  "${n1}" -> "${n2}"\n`
                i++;
            }
        }
        digraph += "}\n";
        console.log(digraph);
    }
}