/**
 * The certificates and certifications offered in the About section.
 *
 * Declared here rather than discovered at runtime: the site is static files on
 * GitHub Pages, and there is nothing on the other end that can list a
 * directory. So adding a document is two steps — drop the PDF in the folder,
 * add a line here — and the second one is what gives it its name and its place
 * in the order.
 *
 * `file` is the name on disk, exactly. It is encoded where the URL is built,
 * not here, because these are the real filenames and they are easier to check
 * against the folder when they are not written as percent escapes.
 */
export interface Doc {
  /** What the reader sees. */
  label: string
  /** The file's name inside its folder, spaces, umlauts and all. */
  file: string
}

export interface DocGroup {
  id: 'zeugnisse' | 'zert'
  /** The folder under `public/` the group's files live in. */
  folder: string
  docs: Doc[]
}

/**
 * The two groups, in the order the picker offers them.
 *
 * Work certificates first because there are four of them against one
 * certification, and because they are what somebody following a link from an
 * application has come to read.
 *
 * The labels here are deliberately not the filenames. On disk they are what the
 * issuer happened to call them — "Arbeitszeugnis Admiral 2019", "Jason Wiersum
 * Prüfungszeugniss DE" — and the reader wants the employer, not the export
 * name. Their order is given rather than alphabetical: it runs from the most
 * recent training placement back through the two employments to the
 * qualification itself.
 */
export const DOC_GROUPS: DocGroup[] = [
  {
    id: 'zeugnisse',
    folder: 'zeugnisse',
    docs: [
      {
        label: 'Praktikumszeugnis Bayerisches Landesamt',
        file: 'Praktikumszeugnis Jason Wiersum.pdf',
      },
      {
        label: 'Arbeitszeugnis Merkur Casino',
        file: 'Arbeitszeugnis Merkur Casino 2024.pdf',
      },
      {
        label: 'Arbeitszeugnis Admiral Filmtheater',
        file: 'Arbeitszeugnis Admiral 2019.pdf',
      },
      {
        label: 'Prüfungszeugnis',
        file: 'Jason Wiersum Prüfungszeugniss DE.pdf',
      },
    ],
  },
  {
    id: 'zert',
    folder: 'zert',
    docs: [{ label: 'EXIN Agile Scrum Foundation', file: 'EXIN Agile Scrum Foundation.pdf' }],
  },
]

/**
 * Where a document actually lives.
 *
 * `encodeURI` and not `encodeURIComponent`: the folder separator has to survive,
 * and every one of these names carries spaces — one carries a `ü` — which a
 * browser will not fetch unescaped.
 */
export function docUrl(group: DocGroup, doc: Doc): string {
  return `${import.meta.env.BASE_URL}${group.folder}/${encodeURI(doc.file)}`
}
