/**
 * Every user-facing string of the interface lives here.
 * Components never hardcode copy — they read it through `useLanguage()`.
 *
 * To edit the wording of the site, edit this file only.
 * Project titles/descriptions are content rather than UI chrome and live,
 * already localised, in `src/data/projects.ts`.
 */

export const LANGUAGES = ['es', 'en', 'de'] as const
export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'de'

/** BCP-47 codes used for the <html lang> attribute. */
export const HTML_LANG: Record<Language, string> = {
  es: 'es',
  en: 'en',
  de: 'de',
}

const es = {
  meta: {
    title: 'Jason Wiersum | Anwendungsentwickler',
    description:
      'Jason Wiersum | Desarrollador de aplicaciones certificado por la IHK en Nürnberg. Software, diseño y creatividad en un mismo perfil.',
  },
  a11y: {
    skipToContent: 'Saltar al contenido',
    mainNavigation: 'Navegación principal',
    languageSelector: 'Seleccionar idioma',
    switchToDark: 'Activar modo oscuro',
    switchToLight: 'Activar modo claro',
    openInNewTab: 'Se abre en una pestaña nueva',
    openSettings: 'Abrir ajustes',
    closeSettings: 'Cerrar ajustes',
    character: 'Ilustración decorativa: un personaje que sigue el cursor con la mirada.',
    characterStill: 'Jason Wiersum, ilustración del personaje del sitio.',
    replayGreeting: 'Repetir el saludo',
  },
  nav: {
    home: 'Inicio',
    work: 'Trabajo',
    about: 'Sobre mí',
    contact: 'Escríbeme',
  },
  hero: {
    greeting: '¡Hola, soy Jason!',
    /** One is picked at random on each load — see `pickTagline`. */
    taglines: [
      'Escribo código. Arreglo bugs. A veces finjo que sé lo que hago.',
      'Programo cosas. Rompo cosas. Luego descubro cómo arreglarlas.',
      'Escribo código. Resuelvo problemas. Creo problemas nuevos sin querer. Resuelvo esos también.',
      'Programo. Debuggeo. Me pregunto quién escribió ese código. Era yo.',
      'Escribo código. Funciona. No lo toco. No preguntes.',
      'Escribo código que funciona a la primera. Nadie me cree. Yo tampoco.',
      'Programo cosas. Busco errores. Encuentro otros que no estaba buscando.',
      'Escribo código. Hago que funcione. Después intento entender por qué funciona.',
      'Transformo ideas en código. Código en bugs. Bugs en experiencia.',
    ],
    ctaProjects: 'Ver proyectos',
    ctaContact: 'Escríbeme',
  },
  about: {
    eyebrow: 'Sobre mí',
    title: 'Más que solo código',
    paragraphs: [
      'Soy desarrollador de aplicaciones y vivo en Nuremberg. Mi camino profesional, sin embargo, no empezó en la informática: estudié en Málaga, dirigí una empresa y trabajé varios años en el ámbito comercial y en la hostelería. Ahí aprendí a asumir responsabilidades, a trabajar con personas, a tratar los datos con cuidado y a asegurarme de que los procesos funcionen de forma fiable.',
      'Con la decisión de dedicarme al desarrollo de software me reorienté profesionalmente. No me interesa solo programar, sino sobre todo entender problemas concretos y crear soluciones que de verdad faciliten el trabajo de las personas. Por eso empecé la formación de Fachinformatiker für Anwendungsentwicklung y la terminé en 2026 aprobando el examen de la IHK.',
      'Hoy combino mi experiencia anterior con mi nueva dirección profesional. Me gusta meterme en sistemas y procesos ya existentes, escuchar a quienes trabajan con ellos e intentar entender primero cuál es el problema real. El código viene después.',
    ],
    tagline: 'Entender. Desarrollar. Mejorar.',
    portraitAlt: 'Jason Wiersum',
    portraitBubble: 'Ese soy yo, Jason',
    cvIntro: 'Si quieres ver toda mi trayectoria laboral, puedes consultar el CV aquí mismo o descargarlo. También puedes ver mis certificados laborales y mis certificaciones.',
    cvView: 'Ver CV',
    cv: 'Descargar CV',
    cvTitle: 'Currículum',
    docsView: 'Ver certificados',
    docsTitle: 'Certificados y certificaciones',
    docsPrompt: '¿Qué quieres ver?',
    docsDownload: 'Descargar',
    docs: {
      zeugnisse: 'Certificados laborales',
      zert: 'Certificaciones',
    },
    timelineTitle: 'Mi camino',
    factsTitle: 'Resumen',
    facts: [
      { label: 'Nombre', value: 'Jason Wiersum' },
      { label: 'Ubicación', value: 'Nuremberg, Baviera, Alemania' },
      {
        label: 'Perfil',
        value: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
      },
    ],
    languagesTitle: 'Idiomas',
    languages: [
      { name: 'Español', level: 'Nativo' },
      { name: 'Inglés', level: 'Nativo' },
      { name: 'Alemán', level: 'C1 · Verhandlungssicher' },
    ],
  },
  skills: {
    title: 'Herramientas con las que trabajo',
    categories: {
      programming: 'Programación',
      frameworks: 'Frameworks Java',
      versionControl: 'Control de versiones',
      tools: 'Herramientas',
      design: 'Diseño',
    },
  },
  projects: {
    title: 'Trabajos recientes',
    viewProject: 'Ver proyecto',
    openDetail: 'Abrir proyecto',
    back: 'Volver al índice',
    client: 'Cliente',
    highlights: 'Qué hace',
    stack: 'Stack',
    tooling: 'Herramientas',
    visitSite: 'Visitar el sitio',
  },
  contact: {
    title: '¿Hablamos?',
    lead: 'Si tienes un proyecto, una vacante o simplemente una idea que quieras comentar, el mensaje llega directo a mi correo.',
    form: {
      name: 'Nombre',
      email: 'Email',
      message: 'Mensaje',
      submit: 'Enviar mensaje',
      sending: 'Enviando…',
      required: 'Obligatorio',
    },
    status: {
      success: '¡Mensaje enviado! Gracias por escribirme.',
      error: 'No se ha podido enviar el mensaje. Inténtalo de nuevo, por favor.',
      network:
        'Sin conexión con el servidor. Comprueba tu red e inténtalo de nuevo.',
      retry: 'Reintentar',
      sendAnother: 'Enviar otro mensaje',
    },
    validation: {
      name: 'Escribe tu nombre.',
      email: 'Escribe un email válido.',
      message: 'Escribe un mensaje de al menos 10 caracteres.',
    },
    elsewhere: 'También estoy aquí',
    linkedin: 'LinkedIn',
    xing: 'Xing',
    github: 'GitHub',
  },
  footer: {
    tagline: 'Software · Diseño · Creatividad',
    location: 'Nürnberg, Bayern',
    rights: 'Todos los derechos reservados.',
    backToTop: 'Volver arriba',
  },
}

/**
 * The shape every language must satisfy, inferred from the Spanish dictionary.
 * Add a key to `es` and the other two languages stop compiling until they
 * catch up — the structure is enforced, the wording is free.
 */
export type Translation = typeof es

const en: Translation = {
  meta: {
    title: 'Jason Wiersum | Anwendungsentwickler',
    description:
      'Jason Wiersum | IHK-certified Anwendungsentwickler based in Nürnberg. Software, design and creativity in one profile.',
  },
  a11y: {
    skipToContent: 'Skip to content',
    mainNavigation: 'Main navigation',
    languageSelector: 'Select language',
    switchToDark: 'Switch to dark mode',
    switchToLight: 'Switch to light mode',
    openInNewTab: 'Opens in a new tab',
    openSettings: 'Open settings',
    closeSettings: 'Close settings',
    character: 'Decorative illustration: a character whose gaze follows the cursor.',
    characterStill: "Jason Wiersum, the site's character illustration.",
    replayGreeting: 'Play the greeting again',
  },
  nav: {
    home: 'Home',
    work: 'Work',
    about: 'About',
    contact: 'Get in touch',
  },
  hero: {
    greeting: "Hi, I'm Jason!",
    taglines: [
      'I write code. I fix bugs. Sometimes I pretend I know what I am doing.',
      'I build things. I break things. Then I work out how to fix them.',
      'I write code. I solve problems. I create new ones without meaning to. I solve those too.',
      'I code. I debug. I wonder who wrote this. Ups, It was me.',
      'I write code. It works. I do not touch it. Do not ask.',
      'I write code that works on the first try. Nobody believes me. Neither do I.',
      'I build things. I look for errors. I find others I was not looking for.',
      'I write code. I make it work. Then I try to understand why it works.',
      'I turn ideas into code. Code into bugs. Bugs into experience.',
    ],
    ctaProjects: 'See projects',
    ctaContact: 'Get in touch',
  },
  about: {
    eyebrow: 'About',
    title: 'More than just code',
    paragraphs: [
      'I am a Software Developer based in Nürnberg. My path did not begin in IT, though: I studied in Málaga, ran a business and spent several years working in commercial roles and in hospitality. That taught me to take responsibility, to work with people, to handle data carefully and to make sure processes run reliably.',
      'Choosing software development meant changing direction. What interests me is not only the programming, but above all understanding concrete problems and building solutions that genuinely make people’s work easier. That is why I began retraining as a Fachinformatiker für Anwendungsentwicklung and completed it in 2026 by passing the IHK examination.',
      'Today I combine what I did before with my new direction. I like getting to grips with existing systems and processes, listening to the people who work with them, and trying to understand the actual problem first. The code comes afterwards.',
    ],
    tagline: 'Understand. Build. Improve.',
    portraitAlt: 'Jason Wiersum',
    portraitBubble: "That's me, Jason",
    cvIntro: 'If you would like the whole work history, you can read the CV here or download it. My references and certifications are here to read as well.',
    cvView: 'View CV',
    cv: 'Download CV',
    cvTitle: 'Curriculum vitae',
    docsView: 'View certificates',
    docsTitle: 'Certificates and certifications',
    docsPrompt: 'What would you like to see?',
    docsDownload: 'Download',
    docs: {
      zeugnisse: 'References',
      zert: 'Certifications',
    },
    timelineTitle: 'My path',
    factsTitle: 'In short',
    facts: [
      { label: 'Name', value: 'Jason Wiersum' },
      { label: 'Location', value: 'Nuremberg, Bavaria, Germany' },
      {
        label: 'Profile',
        value: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
      },
    ],
    languagesTitle: 'Languages',
    languages: [
      { name: 'Spanish', level: 'Native' },
      { name: 'English', level: 'Native' },
      { name: 'German', level: 'C1 · Verhandlungssicher' },
    ],
  },
  skills: {
    title: 'Tools I work with',
    categories: {
      programming: 'Programming',
      frameworks: 'Java frameworks',
      versionControl: 'Version control',
      tools: 'Tools',
      design: 'Design',
    },
  },
  projects: {
    title: 'Recent work',
    viewProject: 'View project',
    openDetail: 'Open project',
    back: 'Back to the overview',
    client: 'Client',
    highlights: 'What it does',
    stack: 'Stack',
    tooling: 'Tooling',
    visitSite: 'Visit the site',
  },
  contact: {
    title: 'Let’s talk.',
    lead: 'If you have a project, a role or simply an idea worth discussing, the message lands straight in my inbox.',
    form: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      submit: 'Send message',
      sending: 'Sending…',
      required: 'Required',
    },
    status: {
      success: 'Message sent! Thanks for getting in touch.',
      error: 'The message could not be sent. Please try again.',
      network: 'No connection to the server. Check your network and try again.',
      retry: 'Try again',
      sendAnother: 'Send another message',
    },
    validation: {
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.',
      message: 'Please write a message of at least 10 characters.',
    },
    elsewhere: 'Also here',
    linkedin: 'LinkedIn',
    xing: 'Xing',
    github: 'GitHub',
  },
  footer: {
    tagline: 'Software · Design · Creativity',
    location: 'Nürnberg, Bavaria',
    rights: 'All rights reserved.',
    backToTop: 'Back to top',
  },
}

const de: Translation = {
  meta: {
    title: 'Jason Wiersum | Anwendungsentwickler',
    description:
      'Jason Wiersum | IHK-zertifizierter Anwendungsentwickler aus Nürnberg. Software, Design und Kreativität in einem Profil.',
  },
  a11y: {
    skipToContent: 'Zum Inhalt springen',
    mainNavigation: 'Hauptnavigation',
    languageSelector: 'Sprache wählen',
    switchToDark: 'In den Dunkelmodus wechseln',
    switchToLight: 'In den Hellmodus wechseln',
    openInNewTab: 'Wird in einem neuen Tab geöffnet',
    openSettings: 'Einstellungen öffnen',
    closeSettings: 'Einstellungen schließen',
    character: 'Dekorative Illustration: eine Figur, deren Blick dem Mauszeiger folgt.',
    characterStill: 'Jason Wiersum, Illustration der Figur dieser Website.',
    replayGreeting: 'Begrüßung noch einmal abspielen',
  },
  nav: {
    home: 'Home',
    work: 'Work',
    about: 'Über mich',
    contact: 'Kontakt',
  },
  hero: {
    greeting: 'Hallo, ich bin Jason!',
    taglines: [
      'Ich schreibe Code. Ich behebe Bugs. Manchmal tue ich so, als wüsste ich, was ich tue.',
      'Ich baue Dinge. Ich mache Dinge kaputt. Dann finde ich heraus, wie man sie repariert.',
      'Ich schreibe Code. Ich löse Probleme. Und schaffe versehentlich neue. Ich löse die auch.',
      'Ich programmiere. Ich debugge. Ich frage mich, wer das geschrieben hat. Ich war es.',
      'Ich schreibe Code. Er läuft. Ich fasse ihn nicht an. Frag nicht.',
      'Ich schreibe Code, der beim ersten Mal funktioniert. Niemand glaubt mir. Ich auch nicht.',
      'Ich baue Dinge. Ich suche Fehler. Ich finde andere, die ich nicht gesucht habe.',
      'Ich schreibe Code. Ich bringe ihn zum Laufen. Danach versuche ich zu verstehen, warum.',
      'Ich mache aus Ideen Code. Aus Code Bugs. Aus Bugs Erfahrung.',
    ],
    ctaProjects: 'Projekte ansehen',
    ctaContact: 'Schreib mich an',
  },
  about: {
    eyebrow: 'Über mich',
    title: 'Mehr als nur Code',
    paragraphs: [
      'Ich bin Fachinformatiker für Anwendungsentwicklung aus Nürnberg. Mein beruflicher Weg begann jedoch nicht in der Informatik: Ich habe in Málaga studiert, ein Unternehmen geführt und mehrere Jahre im kaufmännischen Bereich und in der Gastronomie gearbeitet. Dabei habe ich gelernt, Verantwortung zu übernehmen, mit Menschen zu arbeiten, sorgfältig mit Daten umzugehen und dafür zu sorgen, dass Abläufe zuverlässig funktionieren.',
      'Mit der Entscheidung für die Softwareentwicklung habe ich mich beruflich neu ausgerichtet. Mich interessiert dabei nicht nur das Programmieren, sondern vor allem, konkrete Probleme zu verstehen und Lösungen zu entwickeln, die Menschen ihre Arbeit tatsächlich erleichtern. Deshalb habe ich die Umschulung zum Fachinformatiker für Anwendungsentwicklung begonnen und 2026 erfolgreich mit der IHK-Prüfung abgeschlossen.',
      'Heute verbinde ich meine bisherigen Erfahrungen mit meiner neuen beruflichen Richtung. Ich arbeite mich gerne in bestehende Systeme und Prozesse ein, höre den Menschen zu, die damit arbeiten, und versuche zuerst, das eigentliche Problem zu verstehen. Erst danach kommt der Code.',
    ],
    tagline: 'Verstehen. Entwickeln. Verbessern.',
    portraitAlt: 'Jason Wiersum',
    portraitBubble: 'Das bin ich, Jason',
    cvIntro: 'Wenn du den vollständigen beruflichen Werdegang sehen möchtest, kannst du den Lebenslauf hier ansehen oder herunterladen. Auch meine Arbeitszeugnisse und Zertifizierungen kannst du hier einsehen.',
    cvView: 'Lebenslauf ansehen',
    cv: 'Lebenslauf herunterladen',
    cvTitle: 'Lebenslauf',
    docsView: 'Zeugnisse und Zertifizierungen',
    docsTitle: 'Zeugnisse und Zertifizierungen',
    docsPrompt: 'Was möchtest du sehen?',
    docsDownload: 'Herunterladen',
    docs: {
      zeugnisse: 'Arbeitszeugnisse',
      zert: 'Zertifizierungen',
    },
    timelineTitle: 'Mein Weg',
    factsTitle: 'Zusammengefasst',
    facts: [
      { label: 'Name', value: 'Jason Wiersum' },
      { label: 'Ort', value: 'Nürnberg, Bayern' },
      {
        label: 'Profil',
        value: 'Fachinformatiker für Anwendungsentwicklung (IHK)',
      },
    ],
    languagesTitle: 'Sprachen',
    languages: [
      { name: 'Spanisch', level: 'Muttersprache' },
      { name: 'Englisch', level: 'Muttersprache' },
      { name: 'Deutsch', level: 'C1 · Verhandlungssicher' },
    ],
  },
  skills: {
    title: 'Womit ich arbeite',
    categories: {
      programming: 'Programmierung',
      frameworks: 'Java-Frameworks',
      versionControl: 'Versionsverwaltung',
      tools: 'Werkzeuge',
      design: 'Design',
    },
  },
  projects: {
    title: 'Aktuelle Arbeiten',
    viewProject: 'Projekt ansehen',
    openDetail: 'Projekt öffnen',
    back: 'Zurück zur Übersicht',
    client: 'Auftraggeber',
    highlights: 'Was sie kann',
    stack: 'Stack',
    tooling: 'Werkzeuge',
    visitSite: 'Website besuchen',
  },
  contact: {
    title: 'Reden wir?',
    lead: 'Ob Projekt, Stelle oder einfach eine Idee, über die du sprechen möchtest, die Nachricht landet direkt in meinem Postfach.',
    form: {
      name: 'Name',
      email: 'E-Mail',
      message: 'Nachricht',
      submit: 'Nachricht senden',
      sending: 'Wird gesendet…',
      required: 'Pflichtfeld',
    },
    status: {
      success: 'Nachricht gesendet! Danke für deine Nachricht.',
      error:
        'Die Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.',
      network:
        'Keine Verbindung zum Server. Prüfe dein Netzwerk und versuche es erneut.',
      retry: 'Erneut versuchen',
      sendAnother: 'Weitere Nachricht senden',
    },
    validation: {
      name: 'Bitte gib deinen Namen ein.',
      email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
      message: 'Bitte schreibe eine Nachricht mit mindestens 10 Zeichen.',
    },
    elsewhere: 'Auch hier',
    linkedin: 'LinkedIn',
    xing: 'Xing',
    github: 'GitHub',
  },
  footer: {
    tagline: 'Software · Design · Kreativität',
    location: 'Nürnberg, Bayern',
    rights: 'Alle Rechte vorbehalten.',
    backToTop: 'Nach oben',
  },
}

export const translations: Record<Language, Translation> = { es, en, de }

export const LANGUAGE_LABELS: Record<Language, string> = {
  de: 'DE',
  en: 'EN',
  es: 'ES',
}
