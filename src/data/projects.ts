export type ProjectStatus = 'Concept' | 'Learning Project' | 'In Development' | 'Completed';

export interface Project {
  slug: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  category: string;
  date: string;
  technologies: string[];
  preview?: string;
  previewAlt?: string;
  repository?: string;
  demo?: string;
  overview: string;
  contribution?: string;
  lessons?: string;
  challenges?: string;
}

// Add verified work here when Edward is ready to publish it.
// No example entries are shipped, so the public site never implies a project exists.
export const projects: Project[] = [];
