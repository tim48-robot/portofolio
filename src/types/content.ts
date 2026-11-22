export interface Social {
  label: string;
  href: string;
  icon: 'github' | 'linkedin';
}

export interface StatusRow {
  label: string;
  value: string;
}

/** a row on the Awaken sheet: plain text, the live aura percentage, or the live mana meter */
export interface AwakenRow {
  label: string;
  kind: 'text' | 'aura' | 'meter';
  value?: string;
}

export interface SiteContent {
  name: string;
  greeting: string;
  role: string;
  city: string;
  availability: string;
  headline: { lead: string; punch: string };
  email: string;
  socials: Social[];
  status: StatusRow[];
  footer: { heading: string; credit: string; tagline: string };
  meta: { title: string; description: string };
  awaken: {
    title: string;
    description: string;
    tagline: string;
    rows: AwakenRow[];
  };
}

export interface Project {
  title: string;
  tag: string;
  description: string;
  href: string;
  external: boolean;
  /** which illustration the card shows */
  art: 'logs' | 'screentone';
}
