import type { LocalizedText } from './projects'

/**
 * ---------------------------------------------------------------------------
 * The path, as a list of milestones.
 * ---------------------------------------------------------------------------
 *
 * Every entry here is checked against `public/cv/JasonWiersum-Lebenslauf.pdf`,
 * and the CV wins on names and dates: a timeline on the site that disagrees
 * with the document a recruiter downloads from the same page is worse than no
 * timeline. Where the two said different things it is marked below, so the
 * next person to read this knows which line to change rather than having to
 * find the conflict again.
 *
 * `period` is what sits on the rail and it is deliberately coarse — years, not
 * months. The rail is read at a glance while scrolling; the CV is where the
 * months live, and the button to open it is a few centimetres above this.
 *
 * Proper names are not translated. "Admiral Filmtheater" and "I.E.S. La Cala
 * de Mijas" are what they are called, in every language, and translating them
 * would make them unsearchable.
 */
export interface Milestone {
  /** Stable key. Used for React's list identity and nothing else, so it can be
   *  renamed freely as long as it stays unique. */
  id: string
  /** What shows on the rail: '1992', or '2015 – 2019'. */
  period: string
  /** The one-line headline for the point. */
  label: LocalizedText
  /** Where it happened. A proper name plus a city, so it is not translated. */
  place: string
  /** Optional second line, for what the headline cannot hold. */
  detail?: LocalizedText
  /**
   * Marks the two ends of the line — the first point and the last — which are
   * drawn heavier than the ones between them.
   */
  emphasis?: boolean
}

export const milestones: Milestone[] = [
  {
    id: 'birth',
    period: '1992',
    label: {
      es: 'Nací en Sudáfrica',
      en: 'Born in South Africa',
      de: 'In Südafrika geboren',
    },
    // Not in the CV — German CVs have dropped the birthplace — so this is
    // Jason's own. The DATE is in the CV, as 07.05.1992.
    place: 'Ladysmith, KwaZulu-Natal',
    detail: { es: '7 de mayo', en: '7 May', de: '7. Mai' },
    emphasis: true,
  },
  {
    id: 'school',
    period: '2008',
    label: {
      es: 'Terminé la secundaria',
      en: 'Finished secondary school',
      de: 'Mittlere Reife',
    },
    // Not in the CV, which starts the education section at 2008. Jason's own.
    place: 'Colegio Ecos, Málaga',
    // No detail line. It said "at 16", and the age is already in the two
    // numbers either side of it — 1992 at the top of the line and 2008 on this
    // point. Dropped in all three languages rather than only the German it was
    // raised on: the same sentence in the other two would still be the same
    // arithmetic written out.
  },
  {
    id: 'abitur',
    period: '2010',
    label: {
      es: 'Bachillerato y Selectividad',
      en: 'Bachillerato and university entrance exam',
      de: 'Abitur und Hochschulzugangsprüfung',
    },
    // CV: "2008 - 2010 Gymnasium, I.E.S. La Cala de Mijas, Abschluss: Abitur".
    place: 'I.E.S. La Cala de Mijas, Málaga',
    // No detail line, for the reason the point above gives.
  },
  {
    id: 'university',
    period: '2010 – 2012',
    label: {
      es: 'Ingeniería de Diseño Industrial y Desarrollo de Producto',
      en: 'Industrial Design Engineering and Product Development',
      de: 'Ingenieurstudium Industriedesign und Produktentwicklung',
    },
    // CV: "2010 - 2012 Ingenieurstudium, ohne Abschluss, E.P.S. Málaga".
    place: 'E.P.S., Universidad de Málaga',
    detail: {
      es: 'Sin finalizar',
      en: 'Not completed',
      de: 'Ohne Abschluss',
    },
  },
  {
    id: 'brigada',
    period: '2010 – 2012',
    label: {
      es: 'Fundé y dirigí mi propia empresa',
      en: 'Founded and ran my own company',
      de: 'Eigenes Unternehmen gegründet und geführt',
    },
    // CV: "06/2010 - 10/2012 Geschäftsführer, Brigada Socorrista S.L., Malaga
    // — Aufbau und operative Leitung eines saisonalen Dienstleistungsbetriebs
    // für Rettungsschwimmer. Personalmanagement, Einsatzplanung und
    // Lohnabrechnung."
    //
    // It runs alongside the degree above rather than after it, which is why
    // both carry the same years, and why the detail says so: two identical
    // periods one under the other read as a duplicated row otherwise. It sits
    // second of the two because the About prose upstairs puts them in that
    // order — "estudié en Málaga, dirigí una empresa".
    place: 'Brigada Socorrista S.L., Málaga',
    detail: {
      es: 'En paralelo a los estudios. Socorrismo de temporada: personal, turnos y nóminas.',
      en: 'Alongside the degree. Seasonal lifeguard services: staffing, rotas and payroll.',
      de: 'Parallel zum Studium. Saisonaler Rettungsschwimmerdienst: Personal, Einsatzplanung und Lohnabrechnung.',
    },
  },
  {
    id: 'athena',
    period: '2011',
    label: {
      es: 'Administrativo en proyectos de venta',
      en: 'Administrator on sales projects',
      de: 'Kaufmännischer Angestellter im Vertrieb',
    },
    // CV: "09/2011 - 12/2011 Kaufmännischer Angestellter, Athena Marketing
    // S.L., Malaga — Sachbearbeitung und Datenerfassung in Vertriebsprojekten."
    //
    // Four months, nested inside both the degree and Brigada Socorrista above
    // it. The period is the bare year rather than a range, because a range of
    // one year would sit between two reading "2010 – 2012" and read as a third
    // overlapping block rather than as the short job it was.
    //
    // How short it was is no longer said out loud — "four months" opened the
    // detail line and has been dropped. The CV is one button away and carries
    // 09/2011 - 12/2011; the line above it only has to say what the job was.
    //
    // "im Vertrieb" in German and "de venta" in Spanish so it is not word for
    // word the Merkur point further down, which is the same job title five
    // years later. The CV distinguishes them by their duties, and so does this.
    place: 'Athena Marketing S.L., Málaga',
    detail: {
      es: 'En paralelo a los estudios. Tramitación y registro de datos en proyectos de venta.',
      en: 'Alongside the degree. Case handling and data entry on sales projects.',
      de: 'Parallel zum Studium. Sachbearbeitung und Datenerfassung im Vertrieb.',
    },
  },
  {
    id: 'gastronomy',
    period: '2012 – 2015',
    label: {
      es: 'Me mudé a Alemania y empecé en hostelería',
      en: 'Moved to Germany and started in hospitality',
      de: 'Umzug nach Deutschland, Einstieg in die Gastronomie',
    },
    // Not in the CV, and deliberately so on both sides: the CV runs Málaga to
    // 10/2012 and picks up again at 11/2015 with the Admiral, leaving these
    // three years as a gap, and Jason's decision is that the line tells them
    // and the document stays as it is. So the two disagree here ON PURPOSE —
    // do not "fix" it by deleting this point.
    place: 'La Bodega de Ramón, Nürnberg',
  },
  {
    id: 'admiral',
    period: '2015 – 2019',
    label: {
      es: 'Chef de Bar y después jefe de turno',
      en: 'Chef de Bar, then shift manager',
      de: 'Chef de Bar, danach Schichtleiter',
    },
    // CV: Chef de Bar 11/2015-04/2017, then Schichtleiter 05/2017-01/2019 —
    // one place, two roles, so one point rather than two.
    place: 'Admiral Filmtheater, Nürnberg',
    detail: {
      es: 'Barra, caja, personal y turnos.',
      en: 'Bar, till, staffing and rotations.',
      de: 'Bar, Kasse, Personal und Dienstplanung.',
    },
  },
  {
    id: 'merkur',
    period: '2019 – 2024',
    label: {
      es: 'Administrativo',
      en: 'Commercial administrator',
      de: 'Kaufmännischer Angestellter',
    },
    // CV: 02/2019 - 05/2024, Merkur Casino GmbH, Nürnberg — "Abrechnung,
    // Finanzkontrolle und Verwaltung komplexer Geldbestände, Schwerpunkt auf
    // Datengenauigkeit, Nachvollziehbarkeit und Compliance-Standards."
    //
    // The line takes the third of those three and not the first. Data accuracy
    // is what any of these jobs claims; compliance is the one a casino's books
    // actually turn on, and it is the word Jason wants read here.
    place: 'Merkur Casino GmbH, Nürnberg',
    detail: {
      // "cumplimiento normativo" rather than the English word: it is what the
      // term is called in Spanish, and the point is to be understood.
      es: 'Cuadres, control financiero y cumplimiento normativo.',
      en: 'Reconciliation, controlling and compliance.',
      de: 'Abrechnung, Finanzkontrolle und Compliance.',
    },
  },
  {
    id: 'retraining',
    period: '2024 – 2026',
    label: {
      es: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
      en: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
      de: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
    },
    // CV: GFN 2024-2026, IHK exam summer 2026, with the 12/2025-07/2026
    // placement at the Landesamt inside it. The placement is a line here
    // rather than a point of its own: it happened during the retraining, and
    // the retraining is where this line was asked to end.
    place: 'GFN GmbH, Nürnberg',
    detail: {
      es: 'Prácticas en el Bayerisches Landesamt für Statistik..',
      en: 'Placement at the Bayerisches Landesamt für Statistik.',
      de: 'Praktikum beim Bayerischen Landesamt für Statistik.',
    },
    emphasis: true,
  },
]
