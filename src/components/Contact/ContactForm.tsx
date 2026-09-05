import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Check, Loader2, Send, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  WEB3FORMS_ACCESS_KEY,
  WEB3FORMS_ENDPOINT,
  WEB3FORMS_FROM_NAME,
  WEB3FORMS_SUBJECT,
} from '../../config/web3forms'
import { useLanguage } from '../../hooks/useLanguage'
import { prefersReducedMotionNow } from '../../hooks/usePrefersReducedMotion'

type Status = 'idle' | 'loading' | 'success' | 'error'
type ErrorKind = 'api' | 'network'
type FieldName = 'name' | 'email' | 'message'

const EMPTY = { name: '', email: '', message: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function ContactForm() {
  const { t, language } = useLanguage()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [errorKind, setErrorKind] = useState<ErrorKind>('api')
  const statusRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const node = statusRef.current
      if (!node || status === 'idle' || prefersReducedMotionNow()) return
      gsap.fromTo(
        node,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' },
      )
    },
    { dependencies: [status] },
  )

  const validate = (): boolean => {
    const next: Partial<Record<FieldName, string>> = {}
    if (values.name.trim().length < 2) next.name = t.contact.validation.name
    if (!EMAIL_PATTERN.test(values.email.trim()))
      next.email = t.contact.validation.email
    if (values.message.trim().length < 10)
      next.message = t.contact.validation.message
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const update = (field: FieldName) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Stay on the page: Web3Forms is called with fetch, never as a native POST.
    event.preventDefault()
    if (status === 'loading') return // guards against a double submit
    if (!validate()) return

    setStatus('loading')

    // Honeypot: a person never checks a field they cannot see.
    //
    // This is checked here and deliberately NOT forwarded. The previous version
    // read `.value` and sent it, but an *unchecked* checkbox still reports
    // "on" — so every real submission arrived at Web3Forms carrying a truthy
    // botcheck and was silently discarded as spam. Nothing about the honeypot
    // needs to reach the API for it to do its job.
    const form = event.currentTarget
    const honeypot = form.elements.namedItem('botcheck') as HTMLInputElement | null
    if (honeypot?.checked) {
      // Pretend it worked; a bot gets no signal that it was filtered.
      setValues(EMPTY)
      setStatus('success')
      return
    }

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: WEB3FORMS_SUBJECT,
      from_name: WEB3FORMS_FROM_NAME,
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      language,
    }

    try {
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result: { success?: boolean } = await response.json()

      if (response.ok && result.success) {
        setValues(EMPTY)
        setErrors({})
        setStatus('success')
      } else {
        setErrorKind('api')
        setStatus('error')
      }
    } catch {
      setErrorKind('network')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="form__result form__result--success" ref={statusRef} role="status">
        <span className="form__result-icon" aria-hidden="true">
          <Check size={18} strokeWidth={2.2} />
        </span>
        <p className="form__result-text">{t.contact.status.success}</p>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setStatus('idle')}
        >
          {t.contact.status.sendAnother}
        </button>
      </div>
    )
  }

  const isLoading = status === 'loading'

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot — hidden from people, tempting to bots. */}
      <input
        type="checkbox"
        name="botcheck"
        className="visually-hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <Field
        id="contact-name"
        label={t.contact.form.name}
        value={values.name}
        onChange={update('name')}
        error={errors.name}
        autoComplete="name"
        disabled={isLoading}
      />

      <Field
        id="contact-email"
        type="email"
        label={t.contact.form.email}
        value={values.email}
        onChange={update('email')}
        error={errors.email}
        autoComplete="email"
        disabled={isLoading}
      />

      <Field
        id="contact-message"
        multiline
        label={t.contact.form.message}
        value={values.message}
        onChange={update('message')}
        error={errors.message}
        disabled={isLoading}
      />

      <div className="form__footer">
        <button type="submit" className="btn form__submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 size={16} strokeWidth={2} className="form__spinner" aria-hidden="true" />
              {t.contact.form.sending}
            </>
          ) : (
            <>
              {t.contact.form.submit}
              <Send size={15} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>

        {status === 'error' ? (
          <div
            className="form__result form__result--error"
            ref={statusRef}
            role="alert"
          >
            <span className="form__result-icon" aria-hidden="true">
              <TriangleAlert size={16} strokeWidth={2} />
            </span>
            <p className="form__result-text">
              {errorKind === 'network'
                ? t.contact.status.network
                : t.contact.status.error}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void
  error?: string | undefined
  type?: string
  multiline?: boolean
  autoComplete?: string
  disabled?: boolean
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  multiline = false,
  autoComplete,
  disabled,
}: FieldProps) {
  const errorId = `${id}-error`
  const area = useRef<HTMLTextAreaElement>(null)

  /**
   * Grow the message box to fit what is being written.
   *
   * The drag handle is gone — `resize: none` in contact.css — because dragging
   * it made the form taller and the GitHub button, pinned to the foot of the
   * column beside it, slid away from the two above. Typing does the same thing
   * to the form's height, so the button was unpinned in the same change; this
   * only has to keep the box the right size.
   *
   * Height is cleared before it is read: `scrollHeight` is the content's full
   * height only when the element is not already taller than its content, so
   * measuring without this would ratchet the box up and never let it shrink
   * again. The border is added back because the box sizes border-box and
   * `scrollHeight` counts padding but not borders — set to `scrollHeight`
   * alone the content comes out two pixels short and a scrollbar appears on
   * every line. It stops growing at the max-height the stylesheet sets and
   * scrolls from there.
   */
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const border = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + border}px`
  }, [value, multiline])

  // The label sits inside the field as its placeholder. The real <label> stays
  // in the markup, visually hidden, so screen readers and click-to-focus keep
  // working — a placeholder alone is not an accessible name.
  const shared = {
    id,
    value,
    onChange,
    placeholder: label,
    disabled,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: 'field__control',
  }

  return (
    <div
      className={multiline ? 'field field--grow' : 'field'}
      data-invalid={error ? true : undefined}
    >
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} ref={area} rows={4} />
      ) : (
        <input {...shared} type={type} autoComplete={autoComplete} />
      )}
      {error ? (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
