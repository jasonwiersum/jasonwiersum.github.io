import { Github, Linkedin } from 'lucide-react'
import { useRef } from 'react'
import { XingMark } from './XingMark'
import { SITE } from '../../config/site'
import { useLanguage } from '../../hooks/useLanguage'
import { useReveal } from '../../hooks/useReveal'
import { ContactForm } from './ContactForm'
import './contact.css'

export function Contact() {
  const { t } = useLanguage()
  const root = useRef<HTMLElement>(null)
  useReveal(root)

  return (
    <section id="contact" className="section contact" ref={root}>
      <div className="container contact__grid">
        <div className="contact__intro">
          <h2 className="section__title" data-reveal>
            {t.contact.title}
          </h2>
          {/* The sentence and the three places to find me are one offer —
              write to me here, or go and look over there — so they come in as
              one thing, on one position, rather than as two blocks a scroll
              apart.

              The reveal is on the wrapper and on nothing inside it, which is
              what makes that true: one element fading, everything in it
              carried. The links used to answer to the FORM's position instead,
              because on their own they sit low in the left column and were the
              last thing on the page to arrive — but tying them to the form put
              them on screen before the sentence above them had begun, which is
              backwards. Tied to the sentence, they arrive earlier than either
              arrangement managed and in the right order. */}
          <div className="contact__offer" data-reveal>
            <p className="section__lead">{t.contact.lead}</p>

            <div className="contact__links">
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
        </div>

        <div className="contact__form-wrap card" data-reveal>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}
