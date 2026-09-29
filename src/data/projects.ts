export type ProjectStatus = 'Public repository';

export interface ProjectGallerySlot {
  label: string;
  description: string;
}

export interface ProjectTemplateContent {
  overview: string;
  problem: string;
  solution: string;
  contribution: string;
  features: string[];
  gallery: ProjectGallerySlot[];
  challenges: string;
  lessons: string;
}

export interface Project {
  slug: string;
  title: string;
  /** The repository description returned by GitHub. Null means no description is published. */
  summary: string | null;
  status: ProjectStatus;
  category: 'Selected work';
  repositoryName: string;
  primaryLanguage: string | null;
  repository: string;
  demo?: string;
  documentation?: string;
  template: ProjectTemplateContent;
}

const templateContent = (projectTitle: string): ProjectTemplateContent => ({
  overview: `Template placeholder — add a verified overview of ${projectTitle}, its purpose, and the people it serves.`,
  problem: 'Template placeholder — describe the specific problem, constraint, or opportunity that led to this project.',
  solution: 'Template placeholder — explain the implemented approach after the project details have been reviewed.',
  contribution: 'Template placeholder — outline Edward’s verified responsibilities, decisions, and individual contribution.',
  features: [
    'Template placeholder — add a verified primary feature.',
    'Template placeholder — add a verified supporting feature.',
    'Template placeholder — add a verified usability or technical feature.',
  ],
  gallery: [
    {
      label: 'Preview slot 01',
      description: 'Template placeholder — add a verified interface or project image.',
    },
    {
      label: 'Preview slot 02',
      description: 'Template placeholder — add another verified project view.',
    },
    {
      label: 'Preview slot 03',
      description: 'Template placeholder — add a verified detail or responsive view.',
    },
  ],
  challenges: 'Template placeholder — document a real technical or design challenge and how it was addressed.',
  lessons: 'Template placeholder — summarize a verified lesson or skill gained while completing the project.',
});

/**
 * Only repository identity, GitHub description, and primary language are treated as
 * verified portfolio facts here. Case-study copy remains explicitly marked as a
 * template until Edward supplies reviewed project details.
 */
export const projects: Project[] = [
  {
    slug: 'portfolio',
    title: 'Portfolio',
    summary: 'My first vibe coded portfolio',
    status: 'Public repository',
    category: 'Selected work',
    repositoryName: 'Sincooo/Portfolio',
    primaryLanguage: 'CSS',
    repository: 'https://github.com/Sincooo/Portfolio',
    demo: 'https://portfolio-mu-three-0y1zl55lqc.vercel.app/',
    template: templateContent('Portfolio'),
  },
  {
    slug: 'git-try',
    title: 'Git_try',
    summary: null,
    status: 'Public repository',
    category: 'Selected work',
    repositoryName: 'Sincooo/Git_try',
    primaryLanguage: null,
    repository: 'https://github.com/Sincooo/Git_try',
    template: templateContent('Git_try'),
  },
  {
    slug: 'itec50b-final-project',
    title: 'ITEC50B-Final-Project',
    summary: null,
    status: 'Public repository',
    category: 'Selected work',
    repositoryName: 'Sincooo/ITEC50B-Final-Project',
    primaryLanguage: 'HTML',
    repository: 'https://github.com/Sincooo/ITEC50B-Final-Project',
    template: templateContent('ITEC50B-Final-Project'),
  },
];
