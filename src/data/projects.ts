import type { Language } from '../i18n/translations'

/** A string that exists in every interface language. */
export type LocalizedText = Record<Language, string>

/** A list of strings that exists in every interface language. */
export type LocalizedList = Record<Language, string[]>

/** The long-form content shown when a project card is opened. */
export interface ProjectDetail {
  /** Who it was built for. Not localized — it is a proper name. */
  client?: string
  /** Body copy, one entry per paragraph. */
  body: LocalizedList
  /** Short statements of what the thing does. */
  highlights: LocalizedList
  /**
   * Which heading the list above sits under. "highlights" — the default —
   * says what the thing does, which is only true of something that is built;
   * "scope" says what it is made of, for a project still under construction.
   */
  highlightsAs?: 'highlights' | 'scope'
  /** Editor, tracker, CI — anything that is not part of the running product. */
  tooling?: string[]
  /**
   * Screenshots, relative to `public/` and without a leading slash, e.g.
   * `images/projects/buergermeisterverzeichnis-01.png`. An image that fails to
   * load removes itself, so the dialog never shows a broken thumbnail.
   */
  images?: string[]
}

export interface Project {
  id: string
  title: LocalizedText
  description: LocalizedText
  technologies: string[]
  /**
   * Path to a cover image inside `/public`, or `null` while the slot is still a
   * placeholder (a generated gradient is rendered instead).
   */
  image: string | null
  /**
   * Client mark shown on the card at rest, before the hover preview. Optional:
   * without one the card sets the client's name instead.
   */
  logo?: string | null
  /** Live/repository URL, or `null` when there is nothing to link to yet. */
  url: string | null
  /**
   * A public GitHub repository whose current state is shown alongside the
   * project. The build reads it once per deploy — see the `repo-status` plugin
   * in `vite.config.ts` — so a project that is still moving says so by itself.
   */
  repo?: { owner: string; name: string }
  /** Omit while a card is still a placeholder. */
  detail?: ProjectDetail
}

/**
 * ---------------------------------------------------------------------------
 * PROJECTS — replace these three placeholders with real work.
 * ---------------------------------------------------------------------------
 * For each project: write the three translations, list the technologies,
 * drop a cover image in `public/images/` and point `image` at it
 * (e.g. `image: 'images/my-project.jpg'` — no leading slash, so it keeps
 * working under any GitHub Pages base path) and set `url`. A project without a
 * `url` simply renders without its "view project" link.
 */
export const projects: Project[] = [
  {
    id: 'project-01',
    title: {
      es: 'Bürgermeisterverzeichnis',
      en: 'Bürgermeisterverzeichnis',
      de: 'Bürgermeisterverzeichnis',
    },
    description: {
      es: 'Tabla editable para los resultados de las elecciones municipales bávaras, en la aplicación web interna del Bayerisches Landesamt für Statistik.',
      en: 'An editable table for the results of the Bavarian municipal elections, inside the internal web application of the Bayerisches Landesamt für Statistik.',
      de: 'Editierbare Tabelle für die Ergebnisse der bayerischen Kommunalwahlen, in der internen Webanwendung des Bayerischen Landesamts für Statistik.',
    },
    technologies: ['Grails', 'Groovy', 'AJAX', 'MySQL', 'MariaDB', 'Git'],
    image: null,
    logo: 'images/projects/landesamt-logo.png',
    url: null,
    detail: {
      client: 'Bayerisches Landesamt für Statistik, Fürth',
      tooling: ['IntelliJ IDEA', 'Jira', 'Bitbucket'],
      images: [
        'images/projects/buergermeisterverzeichnis-01.png',
        'images/projects/buergermeisterverzeichnis-02.png',
      ],
      body: {
        es: [
          'Para el Bayerisches Landesamt für Statistik de Fürth construí una tabla dentro de la aplicación web interna del organismo. Renderiza los resultados de las elecciones municipales, Bürgermeister y Oberbürgermeister, y permite editarlos en la propia fila mediante AJAX, sin recargar ni salir de la página.',
          'Los resultados los envía cada municipio por separado. Tras la importación manual había que revisarlos en busca de erratas, problemas de formato y datos que faltaban: una pasada que antes ocupaba a dos Sachbearbeiter durante más de dos meses.',
          'La tabla separa las elecciones principales de las segundas vueltas y las ordena por fecha. Al elegir una fecha aparece cada Landkreis y cada ciudad independiente que votó ese día. Todas las columnas se pueden filtrar y ordenar, y un botón aparte deja a la vista solo los registros marcados como incompletos, de modo que la revisión empieza justo donde falta algo.',
          'La función «Bewerber suchen» busca en la base de datos y compara con los nombres de los candidatos presentados a ese Wahltermin, así que las coincidencias aparecen sin salir de la fila.',
          'El control y la corrección de datos pasó de una media de 55 a 60 minutos por Landkreis o kreisfreie Stadt a una media de 15.',
        ],
        en: [
          'For the Bayerisches Landesamt für Statistik in Fürth I built a table into the office’s internal web application. It renders the results of the municipal elections, Bürgermeister and Oberbürgermeister, and lets them be edited in place over AJAX, without a reload and without leaving the page.',
          'The results are submitted by each municipality separately, so after the manual import they had to be checked for typos, formatting problems and missing values: a pass that had previously occupied two case workers for more than two months.',
          'The table separates main elections from run-offs and orders them by polling day. Pick a date and every Landkreis and every kreisfreie Stadt that voted on it appears. Every column filters and sorts, and a separate button leaves only the records flagged incomplete on screen, so the review starts exactly where something is missing.',
          '“Bewerber suchen” queries the database and matches against the names of the candidates standing at that Wahltermin, so the matches come back without leaving the row.',
          'Checking and correcting the data went from an average of 55 to 60 minutes per Landkreis or kreisfreie Stadt to an average of 15.',
        ],
        de: [
          'Für das Bayerische Landesamt für Statistik in Fürth habe ich eine Tabelle in die interne Webanwendung des Hauses gebaut. Sie rendert die Ergebnisse der Kommunalwahlen, Bürgermeister und Oberbürgermeister, und macht sie direkt in der Zeile per AJAX editierbar, ohne Reload und ohne die Seite zu verlassen.',
          'Die Ergebnisse melden die Gemeinden einzeln. Nach dem manuellen Import mussten sie deshalb auf Tippfehler, Formatprobleme und fehlende Angaben durchgesehen werden — eine Nachbearbeitung, die zuvor zwei Sachbearbeiter über zwei Monate beschäftigt hat.',
          'Die Tabelle trennt Hauptwahlen und Stichwahlen und sortiert sie nach Wahltag. Ist ein Datum gewählt, erscheint jeder Landkreis und jede kreisfreie Stadt, in der an diesem Tag gewählt wurde. Jede Spalte lässt sich filtern und sortieren, und ein eigener Schalter zeigt ausschließlich die als unvollständig markierten Datensätze — die Durchsicht beginnt damit genau dort, wo etwas fehlt.',
          '„Bewerber suchen“ durchsucht die Datenbank und gleicht sie mit den Namen der Bewerber ab, die zu diesem Wahltermin angetreten sind, sodass die Treffer ohne Verlassen der Zeile zurückkommen.',
          'Die Kontrolle und Korrektur der Daten ging von durchschnittlich 55 bis 60 Minuten je Landkreis oder kreisfreier Stadt auf durchschnittlich 15 Minuten zurück.',
        ],
      },
      highlights: {
        es: [
          'Edición en línea por AJAX, sin salir de la página',
          'Elecciones principales y segundas vueltas separadas, listadas por fecha',
          'Desglose por Landkreis y ciudad independiente',
          'Filtrado y ordenación en todas las columnas',
          'Un botón para aislar los registros incompletos',
          '«Bewerber suchen»: búsqueda en base de datos contra los candidatos del Wahltermin',
          'De 55-60 minutos de control por Landkreis a una media de 15',
        ],
        en: [
          'Inline editing over AJAX, without leaving the page',
          'Main elections and run-offs separated, listed by polling day',
          'Breakdown by Landkreis and kreisfreie Stadt',
          'Filtering and sorting on every column',
          'One button to isolate the records flagged incomplete',
          '“Bewerber suchen”: a database search against that Wahltermin’s candidates',
          'From 55-60 minutes of checking per Landkreis to an average of 15',
        ],
        de: [
          'Inline-Bearbeitung per AJAX, ohne die Seite zu verlassen',
          'Haupt- und Stichwahlen getrennt, nach Wahltag gelistet',
          'Aufschlüsselung nach Landkreis und kreisfreier Stadt',
          'Filtern und Sortieren in jeder Spalte',
          'Ein Schalter für die als unvollständig markierten Datensätze',
          '„Bewerber suchen“: Datenbanksuche gegen die Bewerber des Wahltermins',
          'Von 55-60 Minuten Kontrolle je Landkreis auf durchschnittlich 15',
        ],
      },
    },
  },
  {
    id: 'project-02',
    title: {
      es: 'QuickBite',
      en: 'QuickBite',
      de: 'QuickBite',
    },
    description: {
      es: 'Plataforma de pedidos de comida a domicilio, con backend en Java 21 y Spring Boot sobre PostgreSQL, interfaz en React y despliegue en Docker y Kubernetes. En desarrollo abierto.',
      en: 'A food ordering and delivery platform: a Java 21 and Spring Boot backend over PostgreSQL, a React interface, and a deployment on Docker and Kubernetes. In open development.',
      de: 'Plattform für Essensbestellungen mit Lieferung: Backend in Java 21 und Spring Boot auf PostgreSQL, Oberfläche in React, ausgeliefert über Docker und Kubernetes. In offener Entwicklung.',
    },
    technologies: ['Java 21', 'Spring Boot', 'PostgreSQL', 'React', 'Docker', 'Kubernetes'],
    image: null,
    logo: 'images/projects/quickbite-mark.svg',
    url: 'https://github.com/jasonwiersum/QuickBite',
    repo: { owner: 'jasonwiersum', name: 'QuickBite' },
    detail: {
      highlightsAs: 'scope',
      tooling: ['Maven', 'IntelliJ IDEA', 'Git', 'GitHub Actions'],
      body: {
        es: [
          'QuickBite es un proyecto propio: una plataforma donde alguien compone un pedido en un restaurante, lo paga y lo sigue hasta su puerta. Lo construyo desde cero para trabajar el lado de servidor en serio — el reparto del dominio, las transacciones, la forma de la API — en lugar de partir de un backend que ya viene hecho.',
          'El núcleo es un servicio en Java 21 con Spring Boot sobre PostgreSQL. Encima, una interfaz en React. Todo se empaqueta en imágenes Docker y se despliega en Kubernetes, de modo que lo que corre en mi máquina y lo que corre en el clúster sean la misma cosa.',
          'Está en desarrollo activo, así que lo que hay construido cambia de una semana a otra. El bloque de estado de aquí abajo no está escrito a mano: lo rellena la API de GitHub cada vez que se publica este sitio, con el último commit, el reparto de lenguajes y la actividad del repositorio. Si el proyecto avanza, la ficha avanza con él.',
          'Lo siguiente en la lista: el modelo de datos del pedido y el catálogo de restaurantes, la autenticación, y un pipeline de GitHub Actions que construya la imagen y la publique.',
        ],
        en: [
          'QuickBite is a project of my own: a platform where somebody puts together an order at a restaurant, pays for it and follows it to their door. I am building it from nothing in order to work on the server side properly — how the domain divides up, the transactions, the shape of the API — rather than starting from a backend that already exists.',
          'The core is a Java 21 service on Spring Boot over PostgreSQL. On top of it, a React interface. All of it is packaged into Docker images and deployed on Kubernetes, so that what runs on my machine and what runs on the cluster are the same thing.',
          'It is under active development, so what has actually been built changes from one week to the next. The status block below is not written by hand: the GitHub API fills it in every time this site is published, with the latest commit, the language breakdown and the repository’s activity. If the project moves, this card moves with it.',
          'Next on the list: the data model for an order and the restaurant catalogue, authentication, and a GitHub Actions pipeline that builds the image and publishes it.',
        ],
        de: [
          'QuickBite ist ein eigenes Projekt: eine Plattform, auf der jemand eine Bestellung bei einem Restaurant zusammenstellt, bezahlt und bis vor die Tür verfolgt. Ich baue sie von Grund auf, um die Serverseite wirklich zu durchdringen — den Schnitt der Domäne, die Transaktionen, die Form der API — statt auf einem fertigen Backend aufzusetzen.',
          'Der Kern ist ein Java-21-Dienst mit Spring Boot auf PostgreSQL. Darüber eine Oberfläche in React. Alles wird in Docker-Images verpackt und über Kubernetes ausgeliefert, damit das, was auf meinem Rechner läuft, und das, was im Cluster läuft, dasselbe ist.',
          'Das Projekt ist in aktiver Entwicklung, der gebaute Stand ändert sich also von Woche zu Woche. Der Statusblock weiter unten ist nicht von Hand geschrieben: Die GitHub-API füllt ihn bei jeder Veröffentlichung dieser Seite — mit dem letzten Commit, der Sprachverteilung und der Aktivität des Repositorys. Kommt das Projekt voran, kommt diese Karte mit.',
          'Als Nächstes: das Datenmodell der Bestellung und der Restaurantkatalog, die Authentifizierung sowie eine GitHub-Actions-Pipeline, die das Image baut und veröffentlicht.',
        ],
      },
      highlights: {
        es: [
          'Backend en Java 21 y Spring Boot, sobre PostgreSQL',
          'Interfaz en React',
          'Empaquetado en Docker, desplegado en Kubernetes',
          'Una API REST como única frontera entre las dos mitades',
          'Pedido, catálogo de restaurantes y autenticación, en construcción',
          'Estado del repositorio leído de la API de GitHub en cada despliegue',
        ],
        en: [
          'A Java 21 and Spring Boot backend over PostgreSQL',
          'A React interface',
          'Packaged with Docker, deployed on Kubernetes',
          'A REST API as the only border between the two halves',
          'Orders, restaurant catalogue and authentication, under construction',
          'Repository state read from the GitHub API on every deploy',
        ],
        de: [
          'Backend in Java 21 und Spring Boot auf PostgreSQL',
          'Oberfläche in React',
          'In Docker verpackt, über Kubernetes ausgeliefert',
          'Eine REST-API als einzige Grenze zwischen beiden Hälften',
          'Bestellung, Restaurantkatalog und Authentifizierung im Aufbau',
          'Repository-Stand bei jedem Deploy aus der GitHub-API gelesen',
        ],
      },
    },
  },
  {
    id: 'project-03',
    title: {
      es: 'Proyecto tres',
      en: 'Project three',
      de: 'Projekt drei',
    },
    description: {
      es: 'Espacio reservado para el tercer proyecto, donde el lado técnico y el lado gráfico se encuentran.',
      en: 'Reserved space for the third project, where the technical side and the visual side meet.',
      de: 'Platz für das dritte Projekt, in dem technische und gestalterische Seite zusammenkommen.',
    },
    technologies: ['HTML', 'CSS', 'Adobe Creative Cloud'],
    image: null,
    url: null,
  },
]
