import { coreTools } from './core';
import { databaseSkillTools } from './database';
import { webSearchSkillTools } from './search';
import { gitSkillTools } from './git';

export const getSkillTools = (skillName: string) => {
  switch (skillName) {
    case 'database_skill':
      return databaseSkillTools;
    case 'web_search_skill':
      return webSearchSkillTools;
    case 'git_skill':
      return gitSkillTools;
    default:
      return [];
  }
};

export { coreTools };
