import type { ProjectData } from './data.ts';

// Synthetic content only. Never place personal reference-PDF data in source.
export const fixtureProject: ProjectData = {
  version: 1,
  library: {
    profile: { name: 'Synthetic Developer', title: 'Software Engineer', email: 'hello@example.test', phone: '+1 555 0100', location: 'Example City', links: [{ label: 'Portfolio', url: 'https://example.test' }] },
    entries: [
      { id: 'skill-1', sectionId: 'skills', title: 'Programming Languages', subtitle: '', date: '', location: '', description: 'TypeScript, JavaScript, Python, Go', bullets: [], technologies: [], links: [] },
      { id: 'skill-2', sectionId: 'skills', title: 'Frameworks & Libraries', subtitle: '', date: '', location: '', description: 'React, Next.js, Node.js, Express', bullets: [], technologies: [], links: [] },
      { id: 'skill-3', sectionId: 'skills', title: 'Data', subtitle: '', date: '', location: '', description: 'PostgreSQL, SQLite, Redis', bullets: [], technologies: [], links: [] },
      { id: 'skill-4', sectionId: 'skills', title: 'Tools', subtitle: '', date: '', location: '', description: 'Git, Docker, Linux, Figma', bullets: [], technologies: [], links: [] },
      { id: 'exp-1', sectionId: 'experience', title: 'Software Engineer', subtitle: 'Example Labs', date: '2023 – Present', location: 'Remote', description: 'Builds reliable local-first tools for small teams.', bullets: ['Designed an accessible editor with clear keyboard flows.', 'Improved release reliability through repeatable checks.', 'Worked with users to turn feedback into clear product changes.'], technologies: ['TypeScript', 'React', 'Node.js'], links: [] },
      { id: 'proj-1', sectionId: 'projects', title: 'Field Notes', subtitle: 'Personal knowledge app', date: '2024', location: '', description: 'A lightweight app for collecting and finding research notes.', bullets: ['Added fast search across structured records.', 'Built local backup and restore for portable project data.'], technologies: ['TypeScript', 'SQLite'], links: [{ label: 'Source', url: 'https://example.test/source' }] },
      { id: 'proj-2', sectionId: 'projects', title: 'Civic Data Explorer', subtitle: 'Open data dashboard', date: '2023', location: '', description: 'An interactive dashboard that helps residents explore public datasets.', bullets: ['Designed responsive data views with keyboard-accessible filters.', 'Added import validation and safe export for user-created reports.'], technologies: ['React', 'Node.js', 'PostgreSQL'], links: [{ label: 'Demo', url: 'https://example.test/demo' }, { label: 'Source', url: 'https://example.test/civic-source' }] },
      { id: 'proj-3', sectionId: 'projects', title: 'Task Garden', subtitle: '', date: '2022', location: '', description: 'A small planning app for organizing work into focused sessions.', bullets: ['Created reusable task lists and progress summaries.', 'Implemented offline-first storage with simple recovery.'], technologies: ['TypeScript', 'IndexedDB'], links: [] },
      { id: 'edu-1', sectionId: 'education', title: 'BSc Computer Science', subtitle: 'Example University', date: '2020 – 2024', location: 'Example City', description: 'Graduated with honors. Selected coursework in software design and data systems.', bullets: ['Dean’s list for academic performance.'], technologies: [], links: [] },
    ],
  },
  variants: [{ id: 'variant-resume', name: 'Software Engineer Resume', mode: 'resume', templateId: 't01-simple-ats', selectedEntryIds: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'exp-1', 'proj-1', 'proj-2', 'proj-3', 'edu-1'], sections: [
    { id: 'skills', label: 'Skills', entryIds: ['skill-1', 'skill-2', 'skill-3', 'skill-4'], visible: true },
    { id: 'experience', label: 'Experience', entryIds: ['exp-1'], visible: true },
    { id: 'projects', label: 'Projects', entryIds: ['proj-1', 'proj-2', 'proj-3'], visible: true },
    { id: 'education', label: 'Education', entryIds: ['edu-1'], visible: true },
  ], profileOverrides: {}, entryOverrides: {}, design: { paper: 'a4', fontSize: 10, fontFamily: 'serif', marginMm: 18, accentColor: '#315b78', textColor: '#171717', lineSpacing: 1, bulletSpacing: 2, dateAlignment: 'right', showEmail: true, showPhone: true, showLocation: true, showLinks: true, pageNumbers: false }, targetPages: 1, maxPages: 1 },
  { id: 'variant-cv', name: 'Professional CV', mode: 'cv', templateId: 't04-academic-cv', selectedEntryIds: ['edu-1', 'exp-1', 'proj-1', 'proj-2', 'proj-3'], sections: [
    { id: 'education', label: 'Education', entryIds: ['edu-1'], visible: true },
    { id: 'experience', label: 'Experience', entryIds: ['exp-1'], visible: true },
    { id: 'projects', label: 'Projects', entryIds: ['proj-1', 'proj-2', 'proj-3'], visible: true },
  ], profileOverrides: {}, entryOverrides: {}, design: { paper: 'a4', fontSize: 10, fontFamily: 'serif', marginMm: 20, accentColor: '#315b78', textColor: '#171717', lineSpacing: 1.08, bulletSpacing: 3, dateAlignment: 'right', showEmail: true, showPhone: true, showLocation: true, showLinks: true, pageNumbers: false }, targetPages: 2, maxPages: 3 }],
  activeVariantId: 'variant-resume',
};
