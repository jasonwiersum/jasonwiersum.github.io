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
  /**
   * A short demo clip per language, relative to `public/` and without a leading
   * slash. Only the poster is fetched up front; the file loads when play is pressed.
   */
  video?: Record<Language, { src: string; poster: string }>
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
      es: 'ProEntreno',
      en: 'ProEntreno',
      de: 'ProEntreno',
    },
    description: {
      es: 'Aplicación web instalable para entrenadores personales: clientes y cobros, planes de entrenamiento y dieta en PDF, seguimiento del peso con fotos de antes y ahora, cuestionario inicial y check-ins automáticos para los clientes, y recordatorios de pago por WhatsApp, email y notificaciones push.',
      en: 'An installable web app for personal trainers: clients and payments, training and diet plans as PDFs, weight tracking with before-and-after photos, an initial questionnaire and automatic check-ins for clients, and payment reminders over WhatsApp, email and push notifications.',
      de: 'Installierbare Web-App für Personal Trainer: Kunden und Zahlungen, Trainings- und Ernährungspläne als PDF, Gewichtsverlauf mit Vorher-nachher-Fotos, Erstfragebogen und automatische Check-ins für Kunden sowie Zahlungserinnerungen per WhatsApp, E-Mail und Push-Benachrichtigung.',
    },
    technologies: ['React', 'TypeScript', 'Vite', 'Supabase', 'PostgreSQL', 'PWA'],
    image: null,
    logo: 'images/projects/proentreno-logo.png',
    url: null,
    detail: {
      tooling: ['Git', 'GitHub', 'Vercel', 'Vitest', 'Playwright'],
      images: [
        'images/projects/proentreno-01.png',
        'images/projects/proentreno-02.png',
        'images/projects/proentreno-03.png',
        'images/projects/proentreno-04.png',
        'images/projects/proentreno-05.png',
        'images/projects/proentreno-06.png',
        'images/projects/proentreno-07.png',
      ],
      video: {
        es: { src: 'videos/proentreno-brag-es.mp4', poster: 'videos/proentreno-brag-es-poster.jpg' },
        en: { src: 'videos/proentreno-brag-en.mp4', poster: 'videos/proentreno-brag-en-poster.jpg' },
        de: { src: 'videos/proentreno-brag-de.mp4', poster: 'videos/proentreno-brag-de-poster.jpg' },
      },
      body: {
        es: [
          'Es la herramienta con la que un entrenador personal lleva su negocio desde el móvil: sus clientes, lo que le pagan y cuándo, los planes de entrenamiento y dieta que les entrega y cómo evolucionan. Es una aplicación web instalable (PWA): en el iPhone se abre desde la pantalla de inicio como una app más. Las capturas usan un nombre, un logo y unos clientes ficticios.',
          'La agenda de pagos agrupa a los clientes por urgencia —vencidos, esta semana, próximas dos semanas, al día— y un toque registra el pago y adelanta la siguiente fecha, sea mensual, trimestral o anual. Un calendario de ingresos colorea cada día según el estado de sus cobros. Cuando un pago vence, la app avisa con una notificación push y deja recordárselo al cliente por WhatsApp o por email, o hacerlo de forma automática.',
          'Los clientes nuevos no necesitan cuenta ni instalar nada: un enlace general, que el entrenador pone en su Instagram, abre un cuestionario inicial con contacto, salud, hábitos, fotos de frente, de perfil y de espalda y una foto de perfil opcional. Al enviarlo, el entrenador recibe un aviso y el cliente aparece como «por revisar»; si lo acepta, entra en la agenda con sus respuestas ya añadidas a la nota del plan. Después, cada dos semanas la app envía por email un check-in —peso, fotos nuevas y cuatro valoraciones de energía, hambre, sueño y cumplimiento— que se guarda en el seguimiento; si el cliente no responde, se le reenvía a los tres días y se avisa al entrenador. Siete días antes de que termine un plan aparece un aviso de renovación, y un bloque de pendientes en la agenda reúne todo lo que espera una respuesta. La interfaz está en español, inglés y alemán.',
          'Los planes parten de los datos y las notas del cliente: una lesión aparta los ejercicios que la cargan y una alergia, los alimentos que la contienen. Un generador propone el entrenamiento por días, con la ilustración y el mapa muscular de cada ejercicio, y una dieta con los macros calculados sobre una base de más de 125 alimentos, donde cada alimento admite alternativas («100 g de lomo embuchado o jamón serrano o pechuga de pavo»). El plan pasa de borrador a aprobado y a enviado, y el PDF se genera en el propio navegador con el logo y los datos del entrenador.',
          'La sección de seguimiento guarda el peso de cada fecha con las fotos que manda el cliente, lo dibuja en una gráfica que se puede tocar para ver cada registro y compone una imagen de antes y ahora en formato historia de Instagram, con el logo del entrenador, lista para compartir o descargar.',
          'Detrás está Supabase: PostgreSQL con Row Level Security, de modo que solo las cuentas autorizadas llegan a los datos; almacenamiento privado para el logo y las fotos; y Edge Functions en Deno para los emails con Brevo, las notificaciones Web Push, los recordatorios diarios, el seguimiento automático y los formularios públicos, que reciben solo un token por cliente y llevan un campo trampa contra bots. Un modo sandbox, solo para mi cuenta, copia los datos al dispositivo para probar cambios sin tocar los reales. El frontend se despliega en Vercel con cada push y la versión que corre, con su número de despliegue, aparece en los ajustes.',
        ],
        en: [
          'It is the tool a personal trainer runs the business with from a phone: the clients, what they pay and when, the training and diet plans they receive and how they progress. It is an installable web app (PWA): on the iPhone it opens from the home screen like any other app. The screenshots use a made-up name, logo and clients.',
          'The payment agenda groups clients by urgency — overdue, this week, the next two weeks, up to date — and one tap records a payment and moves the next date on, whether monthly, quarterly or yearly. An income calendar colours each day by the state of its payments. When a payment falls due, the app sends a push notification and offers to remind the client over WhatsApp or email, or to do it automatically.',
          'New clients need no account and nothing to install: a general link, which the trainer puts on their Instagram, opens an initial questionnaire covering contact details, health, habits, front, side and back photos and an optional profile picture. When it is sent, the trainer gets an alert and the client appears as “to review”; once accepted, they join the agenda with their answers already added to the plan note. From then on, every two weeks the app emails a check-in — weight, new photos and four ratings for energy, hunger, sleep and adherence — which is stored in the tracking; if the client does not reply, it is sent again after three days and the trainer is alerted. Seven days before a plan ends a renewal notice appears, and a pending block in the agenda gathers everything that is waiting for an answer. The interface is in Spanish, English and German.',
          'Plans start from the client’s data and notes: an injury keeps out the exercises that load it, an allergy the foods that contain it. A generator proposes the training day by day, with an illustration and a muscle map for every exercise, and a diet whose macros are worked out from a base of more than 125 foods, where any food can carry alternatives (“100 g of cured pork loin or serrano ham or turkey breast”). A plan moves from draft to approved to sent, and the PDF is rendered in the browser itself with the trainer’s logo and details.',
          'The tracking section stores each date’s weight with the photos the client sends, draws it on a chart you can tap to read any entry, and composes a before-and-after image in Instagram story format, carrying the trainer’s logo, ready to share or download.',
          'Behind it is Supabase: PostgreSQL with Row Level Security, so that only authorised accounts reach the data; private storage for the logo and photos; and Edge Functions on Deno for email through Brevo, Web Push notifications, the daily reminders, the automatic follow-ups and the public forms, which take only a per-client token and carry a honeypot field against bots. A sandbox mode, open to my account only, copies the data onto the device to try changes without touching the real records. The frontend deploys to Vercel on every push, and the running version, with its deploy number, is shown in the settings.',
        ],
        de: [
          'Es ist das Werkzeug, mit dem ein Personal Trainer sein Geschäft vom Handy aus führt: seine Kunden, was sie ihm wann zahlen, die Trainings- und Ernährungspläne, die sie bekommen, und wie sie sich entwickeln. Es ist eine installierbare Web-App (PWA): Auf dem iPhone öffnet sie sich vom Homescreen wie jede andere App. Die Screenshots zeigen einen erfundenen Namen, ein erfundenes Logo und erfundene Kunden.',
          'Die Zahlungsagenda ordnet die Kunden nach Dringlichkeit — überfällig, diese Woche, nächste zwei Wochen, aktuell —, und ein Tippen verbucht die Zahlung und schiebt den nächsten Termin weiter, monatlich, quartalsweise oder jährlich. Ein Einnahmenkalender färbt jeden Tag nach dem Stand seiner Zahlungen. Wird eine Zahlung fällig, meldet sich die App per Push-Benachrichtigung und bietet an, den Kunden per WhatsApp oder E-Mail zu erinnern, auf Wunsch auch automatisch.',
          'Neue Kunden brauchen weder ein Konto noch eine Installation: Ein allgemeiner Link, den der Trainer auf Instagram setzt, öffnet einen Erstfragebogen mit Kontaktdaten, Gesundheit, Gewohnheiten, Fotos von vorn, von der Seite und von hinten sowie einem optionalen Profilbild. Nach dem Absenden bekommt der Trainer einen Hinweis und der Kunde erscheint als „zu prüfen“; wird er angenommen, landet er mit seinen Antworten, die schon in der Plannotiz stehen, in der Agenda. Danach schickt die App alle zwei Wochen per E-Mail einen Check-in — Gewicht, neue Fotos und vier Bewertungen zu Energie, Hunger, Schlaf und Einhaltung —, der im Verlauf gespeichert wird; antwortet der Kunde nicht, wird er nach drei Tagen erneut verschickt und der Trainer informiert. Sieben Tage vor dem Ende eines Plans erscheint ein Verlängerungshinweis, und ein Block mit offenen Punkten in der Agenda sammelt alles, was auf eine Antwort wartet. Die Oberfläche gibt es auf Spanisch, Englisch und Deutsch.',
          'Die Pläne gehen von den Daten und Notizen des Kunden aus: Eine Verletzung hält die Übungen fern, die sie belasten, eine Allergie die Lebensmittel, die sie enthalten. Ein Generator schlägt das Training Tag für Tag vor, mit Illustration und Muskelkarte zu jeder Übung, dazu eine Ernährung, deren Makros aus einer Basis von über 125 Lebensmitteln berechnet werden; jedes Lebensmittel kann Alternativen tragen („100 g Lomo embuchado oder Serranoschinken oder Putenbrust“). Ein Plan geht vom Entwurf über die Freigabe bis zum Versand, und das PDF entsteht direkt im Browser mit Logo und Kontaktdaten des Trainers.',
          'Der Bereich Verlauf speichert das Gewicht jedes Datums mit den Fotos, die der Kunde schickt, zeichnet es in ein Diagramm, in dem ein Tippen jeden Eintrag zeigt, und setzt ein Vorher-nachher-Bild im Format einer Instagram-Story zusammen, mit dem Logo des Trainers, bereit zum Teilen oder Herunterladen.',
          'Dahinter steht Supabase: PostgreSQL mit Row Level Security, sodass nur berechtigte Konten an die Daten kommen; privater Speicher für Logo und Fotos; und Edge Functions auf Deno für den E-Mail-Versand über Brevo, die Web-Push-Benachrichtigungen, die täglichen Erinnerungen, die automatische Nachverfolgung und die öffentlichen Formulare, die nur ein Token pro Kunde annehmen und ein Honeypot-Feld gegen Bots tragen. Ein Sandbox-Modus, nur für mein Konto, kopiert die Daten aufs Gerät, um Änderungen zu testen, ohne die echten Daten anzurühren. Das Frontend geht bei jedem Push auf Vercel live, und die laufende Version samt Deploy-Nummer steht in den Einstellungen.',
        ],
      },
      highlights: {
        es: [
          'Instalable en el iPhone como PWA, en modo claro y oscuro',
          'Agenda de pagos por urgencia y calendario de ingresos',
          'Recordatorios al cliente por WhatsApp o email, y avisos push al entrenador',
          'Planes de entrenamiento y dieta adaptados a lesiones y alergias',
          'Alimentos con alternativas y PDF con la marca del entrenador',
          'Seguimiento del peso con gráfica, fotos e imagen de antes y ahora',
          'Cuestionario inicial público con fotos y foto de perfil, sin crear cuenta',
          'Check-in automático cada dos semanas por email, con peso, fotos y valoraciones',
          'Aviso de renovación del plan y bloque de pendientes en la agenda',
          'Disponible en español, inglés y alemán',
          'Row Level Security y Edge Functions para email, Web Push y avisos diarios',
        ],
        en: [
          'Installable on the iPhone as a PWA, in light and dark mode',
          'Payment agenda by urgency and an income calendar',
          'Client reminders over WhatsApp or email, push alerts for the trainer',
          'Training and diet plans adapted to injuries and allergies',
          'Foods with alternatives, PDFs in the trainer’s branding',
          'Weight tracking with a chart, photos and a before-and-after image',
          'Public initial questionnaire with photos and a profile picture, no account needed',
          'Automatic check-in every two weeks by email, with weight, photos and ratings',
          'Plan renewal notice and a pending block in the agenda',
          'Available in Spanish, English and German',
          'Row Level Security and Edge Functions for email, Web Push and daily alerts',
        ],
        de: [
          'Auf dem iPhone als PWA installierbar, im hellen und dunklen Modus',
          'Zahlungsagenda nach Dringlichkeit und Einnahmenkalender',
          'Kundenerinnerungen per WhatsApp oder E-Mail, Push-Hinweise für den Trainer',
          'Trainings- und Ernährungspläne, angepasst an Verletzungen und Allergien',
          'Lebensmittel mit Alternativen, PDFs im Branding des Trainers',
          'Gewichtsverlauf mit Diagramm, Fotos und Vorher-nachher-Bild',
          'Öffentlicher Erstfragebogen mit Fotos und Profilbild, ohne Konto',
          'Automatischer Check-in alle zwei Wochen per E-Mail, mit Gewicht, Fotos und Bewertungen',
          'Verlängerungshinweis für den Plan und Block mit offenen Punkten in der Agenda',
          'Verfügbar auf Spanisch, Englisch und Deutsch',
          'Row Level Security und Edge Functions für E-Mail, Web Push und tägliche Hinweise',
        ],
      },
    },
  },
]
