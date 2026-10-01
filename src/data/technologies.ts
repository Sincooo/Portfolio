export type Technology = {
  name: string;
  tag: string;
  color: string;
  summary: string;
  story: string;
  next: string;
};
export const technologies = [
  { name: 'Java', tag: 'CURRENT FOCUS', color: 'yellow', summary: 'A return to the language that started it all.', story: 'Java was my first programming language in senior high school. I am studying it again in college, revisiting the fundamentals with a more deliberate approach and building a stronger grasp of how programs are structured.', next: 'Currently learning through coursework and practice.' },
  { name: 'HTML', tag: 'WEB STRUCTURE', color: 'orange', summary: 'Giving web pages a meaningful structure.', story: 'I learned HTML through college coursework, alongside CSS and JavaScript. It introduced me to the structure behind a web page and how its content is organized.', next: 'Looking to apply it in more complete work.' },
  { name: 'CSS', tag: 'WEB PRESENTATION', color: 'blue', summary: 'Connecting structure with visual presentation.', story: 'I learned CSS through college coursework, alongside HTML and JavaScript. It introduced me to how styles shape the visual presentation of a web page.', next: 'Looking to apply it in more complete work.' },
  { name: 'JavaScript', tag: 'WEB INTERACTION', color: 'yellow', summary: 'Exploring how the web becomes interactive.', story: 'I learned JavaScript through college coursework, alongside HTML and CSS. Together, they introduced me to the relationship between structure, visual presentation, and interaction.', next: 'Looking to apply it in more complete work.' },
  { name: 'Python', tag: 'COLLEGE FOUNDATION', color: 'cyan', summary: 'Turning problems into a sequence of steps.', story: 'I encountered Python in my first year of college, mainly through the curriculum. Working with it helped me become more comfortable with core programming ideas and approaching problems logically.', next: 'Continuing to strengthen the fundamentals.' },
  { name: 'Visual Basic', tag: 'EARLY EXPERIENCE', color: 'blue', summary: 'An early introduction to coding logic.', story: 'I studied Visual Basic in senior high school. It introduced me to the basics of coding and helped make programming feel approachable before I moved on to other languages.', next: 'Part of the foundation I still build on.' },
] satisfies Technology[];