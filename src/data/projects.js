// The project "worlds" — five manifestations of one belief: human potential grows through
// exploration, guidance, learning, craftsmanship, and perseverance. (Master brief: the vault's
// "Project World Definitions".) Each carries a concept FILM (a concept visualization, never a fake
// running product) shown on its card and, larger, in the case-study panel.
//
// Honesty rules, unchanged: status badges stay truthful; `href: null` marks a Concept with no
// destination yet (the card still opens its case study, but the panel shows an honest "in design"
// note, never a fabricated demo or dead `#` link). Only Khaylub.com is live, so only it links out.

export const projects = [
  {
    id: 'khaylub',
    name: 'Khaylub.com',
    theme: ['Journey', 'Growth', 'Perseverance'],
    concept:
      'A public record of the climb from beginner to professional — growth as an ongoing journey, not a destination.',
    status: 'Live · this site',
    href: 'https://khaylub.com',
    film: '/assets/video/concept-khaylub.mp4',
    poster: '/assets/projects/poster-khaylub.jpg',
    detail: {
      summary:
        'The site you are on — a scroll-driven 3D experience built around a traveler climbing from curiosity to capability. Not a destination but the climb itself: where I am now, what I am learning, and what I am building next.',
      highlights: [
        'One continuous scroll-synchronized 3D timeline',
        'A rigged traveler as the protagonist, built and documented in the open',
        'The athlete-to-technologist journey, made literal',
      ],
      tech: ['React Three Fiber', 'Three.js', 'Vite', 'Blender'],
      links: [
        { label: 'Visit live', href: 'https://khaylub.com' },
        { label: 'Source', href: 'https://github.com/KhaylubThompsonCalvin/khaylub-portfolio' },
      ],
    },
  },
  {
    id: 'eyesunclouded',
    name: 'EyesUnclouded.ai',
    theme: ['Exploration', 'Perception', 'Discernment'],
    concept:
      'Interactive worlds that teach discernment — reading people through body language and observation, experiencing ideas instead of reading them.',
    status: 'Concept',
    href: null,
    film: '/assets/video/concept-eyesunclouded.mp4',
    poster: '/assets/projects/poster-eyesunclouded.jpg',
    detail: {
      summary:
        'Experience first, understanding second. A concept for interactive worlds where people learn to read body language, micro-expressions, and what others miss — discernment in the spirit of "Lie to Me" — by living through it rather than studying it.',
      highlights: [
        'Discernment through body language and observation',
        'Learning by exploration, not instruction',
        'Wonder, curiosity, perspective shifts',
      ],
      tech: [],
      links: [],
    },
  },
  {
    id: 'cloelia',
    name: 'Cloelia.ai',
    theme: ['Guidance', 'Trust', 'Clarity'],
    concept:
      'An AI guidance service — a team of intelligent specialists who help you cross uncertain territory and leave knowing where to go.',
    status: 'Concept',
    href: null,
    film: '/assets/video/concept-cloelia.mp4',
    poster: '/assets/projects/poster-cloelia.jpg',
    detail: {
      summary:
        'Guidance through uncertainty. Instead of searching dozens of disconnected tools, a team of intelligent guides — across law, business, education, career, and finance — helps you navigate decisions. You arrive uncertain and leave with clarity and direction.',
      highlights: [
        'A team of specialists, not one generalist',
        'Guidance across difficult terrain',
        'Wisdom, trust, calm intelligence',
      ],
      tech: [],
      links: [],
    },
  },
  {
    id: 'futuregenius',
    name: 'FutureGenius.ai',
    theme: ['Learning', 'Progression', 'Mastery'],
    concept:
      'An AI-guided learning companion that maps where you are to where you want to go, then unlocks the path — milestones, certifications, and projects tied to real outcomes.',
    status: 'Concept',
    href: null,
    film: '/assets/video/concept-futuregenius.mp4',
    poster: '/assets/projects/poster-futuregenius.jpg',
    detail: {
      summary:
        'Unlocking potential through structured progression. Too many people have talent but no idea where to start. A concept for a companion that maps where you are to where you want to be and lights the path — confusion to understanding to momentum to mastery.',
      highlights: [
        'A personalized roadmap from here to your goal',
        'Milestones, certifications, and projects tied to real outcomes',
        'Potential, momentum, possibility — "I can actually become this"',
      ],
      tech: [],
      links: [],
    },
  },
  {
    id: 'manors',
    name: 'Manors.ai',
    theme: ['Craftsmanship', 'Trust', 'Coordination'],
    concept:
      'Helping real people do real work — connecting homeowners with skilled tradespeople, with the technology kept quietly in the background.',
    status: 'Concept',
    href: null,
    film: '/assets/video/concept-manors.mp4',
    poster: '/assets/projects/poster-manors.jpg',
    detail: {
      summary:
        'Improving home services and skilled trades through technology that disappears into the background. Homeowners struggle to find trustworthy help; workers struggle with scheduling, communication, and running a business. A concept that connects both sides — the home and the people matter more than the platform.',
      highlights: [
        'Connecting homeowners with trustworthy tradespeople',
        'Scheduling, job tracking, and clear communication',
        'Reliability, craftsmanship, community',
      ],
      tech: [],
      links: [],
    },
  },
];
