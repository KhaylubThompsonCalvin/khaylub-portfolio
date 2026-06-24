// All site copy in Kt's own words. Single place to edit voice.
// Sources: Experience Architect Master Prompt + Narrative Source (Lock-In / Letter to Time).

export const identity = {
  name: 'Khaylub Thompson-Calvin',
  role: 'Computer Information Systems Student \u00b7 Builder \u00b7 Lifelong Learner',
  statement:
    'Currently focused on web development, interactive 3D, and creating digital experiences that combine technology, storytelling, and continuous growth.',
};

// Phase 02 — Philosophy (verbatim from the master prompt)
export const philosophy = {
  lead: 'The best systems are built one layer at a time.',
  body: 'This portfolio documents that process: learning in public, building practical skills, and steadily expanding into new areas of technology.',
};

// Phase 03 — Areas of Focus
export const areasOfFocus = [
  'Web Development',
  'Interactive 3D',
  'Linux & Systems',
  'Python & SQL',
  'Creative Technology',
  'Future Cybersecurity Path',
];

// Closing principle (used near contact)
export const closingPrinciple =
  'The experience is not about reaching the summit. The experience is about continuing the climb.';

export const contact = {
  intro: 'Continuing the climb \u2014 let\u2019s build something.',
  // One honest line for recruiters — answers the first question without a form.
  // Update the window when it changes; never show a stale date.
  availability: 'Open to internship opportunities \u00b7 Summer\u2013Fall 2026',
  links: [
    { label: 'GitHub', href: 'https://github.com/KhaylubThompsonCalvin' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/khaylub-thompson-calvin-40543b294/' },
    { label: 'Email', href: 'mailto:khaylubthompsoncalvin@gmail.com' },
    // Resume stays an honest 'soon' until /public/resume.pdf exists; then set href: '/resume.pdf'.
    { label: 'Resume', href: '#' },
  ],
};
