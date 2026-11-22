import type { Project } from '../types/content';

export const projects: Project[] = [
  {
    title: 'Study logging',
    tag: 'GSoC 2026',
    description:
      'Activity logging for RUXAILAB usability studies: a server-checked pipeline that never stores answers or personal data, and a Log Explorer for researchers. 12 PRs merged.',
    href: 'https://github.com/ruxailab/ruxailab-wiki/blob/main/GSoC2026-JustinTimothy.md',
    external: true,
    art: 'logs',
  },
  {
    title: 'Screentone',
    tag: 'Canvas',
    description:
      'Turns any image into a printed manhwa panel, ink dots and one spot colour, with your cursor revealing the original underneath.',
    href: '#home',
    external: false,
    art: 'screentone',
  },
];
