import type { Translation } from '../i18n/translations'

export interface SkillGroup {
  /** Key into `t.skills.categories` — the label itself is translated. */
  category: keyof Translation['skills']['categories']
  items: SkillItem[]
}

export interface SkillItem {
  name: string
}

/**
 * Only the technologies Jason actually works with. No invented tools, no
 * proficiency percentages — the grouping carries the meaning instead.
 */
export const skillGroups: SkillGroup[] = [
  {
    category: 'programming',
    items: [
      { name: 'Java' },
      { name: 'Python' },
      { name: 'HTML' },
      { name: 'CSS' },
      { name: 'JavaScript' },
    ],
  },
  {
    category: 'frameworks',
    items: [{ name: 'Grails' }, { name: 'Spring' }],
  },
  {
    category: 'versionControl',
    items: [{ name: 'Git' }],
  },
  {
    category: 'tools',
    items: [
      // The editors lead: they are the tool of the trade, and the two that
      // follow are what the work is tracked and designed in.
      { name: 'VS Code' },
      // The full product name, as project one's tooling list already spells it.
      { name: 'IntelliJ IDEA' },
      { name: 'Atlassian' },
      { name: 'Adobe Creative Cloud' },
    ],
  },
  {
    category: 'design',
    items: [
      { name: 'Photoshop' }, { name: 'Illustrator' },{ name: 'Lightroom' },
    ],
  },
]
