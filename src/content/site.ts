import type { SiteContent } from '../types/content';

export const site: SiteContent = {
  name: 'Justin Timothy',
  greeting: "hey, I'm Justin :)",
  role: 'Developer',
  city: 'Jakarta',
  availability: 'open to opportunities',
  headline: { lead: 'I build things that ', punch: 'hit.' },
  email: 'justintimothy303@gmail.com',
  socials: [
    { label: 'GitHub', href: 'https://github.com/tim48-robot', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/justin-timothy-w-b6b28817b/', icon: 'linkedin' },
  ],
  status: [
    { label: 'Name', value: 'Justin Timothy' },
    { label: 'Role', value: 'Developer' },
    { label: 'Stack', value: 'Go' },
    { label: 'Status', value: 'Open to opportunities' },
  ],
  footer: {
    heading: "Let's build something.",
    credit: '© 2026 Justin Timothy',
    tagline: 'drawn in ink, built with too much manhwa',
  },
  meta: {
    title: 'Justin Timothy',
    description: 'Justin Timothy, developer in Jakarta. I build things that hit.',
  },
  awaken: {
    title: 'Awaken · Justin Timothy',
    description: 'Justin Timothy, awakened.',
    tagline: 'Developer. I build things that hit.',
    rows: [
      { label: 'Name', kind: 'text', value: 'Justin Timothy' },
      { label: 'Class', kind: 'text', value: 'Developer' },
      { label: 'Aura', kind: 'aura' },
      { label: 'Mana', kind: 'meter' },
      { label: 'Skills', kind: 'text', value: 'Go' },
    ],
  },
};
