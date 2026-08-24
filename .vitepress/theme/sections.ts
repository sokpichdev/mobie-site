// The toolkit's top-level sections, in reading order. Shared by the landing page's
// inventory grid and the 404 page so the two can't drift apart. Counts come from
// themeConfig.inventory (derived from the fetched tree at build time), so a section
// that isn't in the toolkit simply renders nothing.
export interface Section {
  slug: string
  label: string
  blurb: string
}

export const SECTIONS: Section[] = [
  { slug: 'agents', label: 'Agents', blurb: 'Loadable expert roles' },
  { slug: 'skills', label: 'Skills', blurb: 'Deep, single-topic know-how' },
  { slug: 'workflows', label: 'Workflows', blurb: 'Step-by-step procedures' },
  { slug: 'checklists', label: 'Checklists', blurb: 'Objective review gates' },
  { slug: 'standards', label: 'Standards', blurb: 'Non-negotiable rules' },
  { slug: 'architecture', label: 'Architecture', blurb: 'Reference designs' },
  { slug: 'prompts', label: 'Prompts', blurb: 'Copy-paste prompts' },
  { slug: 'templates', label: 'Templates', blurb: 'Boilerplate scaffolding' },
  { slug: 'examples', label: 'Examples', blurb: 'Reference apps' }
]
