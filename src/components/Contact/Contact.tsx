import { Github, Linkedin } from 'lucide-react'
import { useRef } from 'react'
import { XingMark } from './XingMark'
import { SITE } from '../../config/site'
import { useLanguage } from '../../hooks/useLanguage'
import { useReveal } from '../../hooks/useReveal'
import { useRevealed } from '../../hooks/useRevealed'
import { ContactForm } from './ContactForm'
import './contact.css'

export function Contact() {
  const { t } = useLanguage()
  const root = useRef<HTMLElement>(null)
  useReveal(root)

  /**
   * The links arrive with the form, whichever of the two the reader reaches
   * first.
   *
   * They are one offer — write to me here, or find me over there — and only
   * the markup separates them. On a wide screen the form is in the right
   * column and the links sit low in the left one, 170px further down, so on
   * their own position they were the last thing on the page to appear: the
   * form was there to be filled in while LinkedIn, Xing and GitHub were still
   * invisible, and a reader who stopped at the form never saw them at all.
   * Stacked on a narrow screen the order flips and the links come first.
   *
   * So neither one waits for the other: whichever crosses the entrance line
   * first brings both, which is the same rule in both layouts rather than a
   * breakpoint's worth of special cases. They leave together for the same
   * reason.
   */
  const [linksBox, linksNear] = useRevealed()
  const [formBox, formNear] = useRevealed()

  return (
    <section id="contact" className="section contact" ref={root}>
      <div className="container contact__grid">
        <div className="contact__intro">
          <h2 className="section__title" data-reveal>
            {t.contact.title}
          </h2>
          <p className="section__lead" data-reveal>
            {t.contact.lead}
          </p>

          {/* `data-shown` rather than `data-reveal`: this block answers to the
              form's position as well as its own, which a plain reveal cannot
              express. Carrying both would put useReveal's opacity in a fight
              with the CSS transition. */}
          <div
            className="contact__links"
            ref={linksBox}
            data-shown={linksNear || formNear || undefined}
          >
            <p className="contact__links-title">{t.contact.elsewhere}</p>
            <ul>
              <li>
                <a
                  href={SITE.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__link contact__link--linkedin"
                >
                  <Linkedin size={16} strokeWidth={1.9} aria-hidden="true" />
                  {t.contact.linkedin}
                  <span className="visually-hidden">{t.a11y.openInNewTab}</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE.links.xing}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__link contact__link--xing"
                >
                  <XingMark />
                  {t.contact.xing}
                  <span className="visually-hidden">{t.a11y.openInNewTab}</span>
                </a>
              </li>
              {/* Third, and on its own row: the CSS puts it across both columns
                  and pins it to the bottom of the block. */}
              <li className="contact__links-tail">
                <a
                  href={SITE.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact__link contact__link--github"
                >
                  <Github size={16} strokeWidth={1.9} aria-hidden="true" />
                  {t.contact.github}
                  <span className="visually-hidden">{t.a11y.openInNewTab}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Keeps its own reveal; the ref is only there to be watched, so the
            links can come in with it. */}
        <div className="contact__form-wrap card" ref={formBox} data-reveal>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
