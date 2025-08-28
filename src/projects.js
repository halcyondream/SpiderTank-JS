import { Project } from 'ts-morph';


export class ProjectTypes {
  JAVASCRIPT = 0;
  TYPESCRIPT = 1;
  ANGULAR = 2;
}

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

export default {
  ProjectTypes: ProjectTypes,
  getProject: getProject
};