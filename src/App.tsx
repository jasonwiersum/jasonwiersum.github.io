import { useCallback, useRef, useState } from 'react'
import { SECTION_IDS, type SectionId } from './config/site'
import { useLanguage } from './hooks/useLanguage'
import { useScrollTo } from './hooks/useScrollTo'
import { useSectionObserver } from './hooks/useSectionObserver'
import { useSectionTransitions } from './hooks/useSectionTransitions'
import { About } from './components/About/About'
import { Contact } from './components/Contact/Contact'
import { Hero } from './components/Hero/Hero'
import { Backdrop } from './components/Layout/Backdrop'
import { Footer } from './components/Layout/Footer'
import { FloatingNavigation } from './components/Navigation/FloatingNavigation'
import { SettingsIsland } from './components/Navigation/SettingsIsland'
import { Projects } from './components/Projects/Projects'
import { Skills } from './components/Skills/Skills'
import './components/Navigation/navigation.css'

export default function App() {
  const { t } = useLanguage()
  const observedSection = useSectionObserver(SECTION_IDS)
  const mainRef = useRef<HTMLElement>(null)
  useSectionTransitions(mainRef)

  // While a click-driven scroll is in flight, the destination wins over what the
  // observer sees: the page sweeps past every section in between, and letting
  // that reach the pill turned one glide into a stutter.
  const scrollTo = useScrollTo()
  const [pendingSection, setPendingSection] = useState<SectionId | null>(null)
  const activeSection = pendingSection ?? observedSection

  const goToSection = useCallback(
    (id: SectionId) => {
      setPendingSection(id)
      scrollTo(id, () => setPendingSection(null))
    },
    [scrollTo],
  )

  return (
    <>
      <a className="skip-link" href="#main">
        {t.a11y.skipToContent}
      </a>

      <Backdrop />

      <FloatingNavigation activeSection={activeSection} onSelect={goToSection} />
      <SettingsIsland />

      {/* Everything that is read sits on one sheet, the footer included: the
          gradient behind it shows in the margin, and the content floats. */}
      <div className="sheet">
        <main id="main" className="page" ref={mainRef}>
          <Hero />

          {/* Work is what he does: the output first, the tools underneath it. */}
          <section id="work" className="section">
            <Projects />
            <Skills />
          </section>

          <section id="about" className="section">
            <About />
          </section>

          <Contact />
        </main>

        <Footer />
      </div>
    </>
  )
}
