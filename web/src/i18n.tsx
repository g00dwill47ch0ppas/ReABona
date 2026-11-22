import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { i18nContext, useI18n, type Language } from './i18n-context'
import messages from './ui-messages.json'

type Result = { language: Language; translations: Record<string, string>; error: string }

const languages: Language[] = ['en', 'tn', 'st', 'af']
const catalogHash = JSON.stringify(messages).split('').reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0
const cacheKey = (language: Language) => `reabona-ui-v1-${catalogHash}-${language}`
const loadCached = (language: Language): Result | null => {
  try {
    const raw = localStorage.getItem(cacheKey(language))
    if (!raw) return null
    const translations: unknown = JSON.parse(raw)
    if (!translations || typeof translations !== 'object' || Array.isArray(translations) ||
        !messages.every(message => typeof (translations as Record<string, unknown>)[message] === 'string')) return null
    return { language, translations: translations as Record<string, string>, error: '' }
  } catch (error) {
    console.warn('Unable to read cached interface translations.', error)
    return null
  }
}
const translationWarnings: Record<Language, string> = {
  en: '',
  tn: 'Dithanolo tsa AI di ka nna le diphoso.',
  st: 'Diphetolelo tsa AI di ka ba le diphoso.',
  af: 'KI-vertalings kan foute bevat.',
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('reabona-language')
    return languages.find(value => value === stored) || 'en'
  })
  const [results, setResults] = useState<Partial<Record<Language, Result>>>(() => {
    const cached: Partial<Record<Language, Result>> = {}
    for (const language of languages.slice(1)) {
      const result = loadCached(language)
      if (result) cached[language] = result
    }
    return cached
  })
  const inFlight = useRef(new Map<Language, Promise<void>>())
  const cache = useRef(results)

  const load = useCallback((target: Language) => {
    if (target === 'en' || (cache.current[target] && !cache.current[target]?.error)) return Promise.resolve()
    const existing = inFlight.current.get(target)
    if (existing) return existing
    const request = (async () => {
      try {
        const headers = { 'X-Demo-User': localStorage.getItem('reabona-demo-user') || 'citizen' }
        const response = await fetch(`/api/ui-translations?language=${target}`, { headers })
        if (!response.ok) throw new Error('The selected language could not be loaded. The interface is shown in English.')
        const translations: Record<string, string> = await response.json()
        if (!messages.every(message => typeof translations[message] === 'string' && translations[message].trim())) throw new Error('Incomplete translations')
        try { localStorage.setItem(cacheKey(target), JSON.stringify(translations)) }
        catch (error) { console.warn('Unable to cache interface translations.', error) }
        const result = { language: target, translations, error: '' }
        cache.current[target] = result
        setResults(current => ({ ...current, [target]: result }))
      } catch {
        const result = { language: target, translations: {}, error: 'The selected language could not be loaded. The interface is shown in English.' }
        cache.current[target] = result
        setResults(current => ({ ...current, [target]: result }))
      } finally {
        inFlight.current.delete(target)
      }
    })()
    inFlight.current.set(target, request)
    return request
  }, [])

  const warmLanguages = useEffectEvent(async (isActive: () => boolean) => {
    const order = [language, ...languages.slice(1).filter(item => item !== language)]
    for (const target of order) {
      if (!isActive()) break
      await load(target)
    }
  })
  useEffect(() => {
    let active = true
    void warmLanguages(() => active)
    return () => { active = false }
  }, [load])

  useEffect(() => { if (language !== 'en' && !cache.current[language]) void load(language) }, [language, load])

  const current = results[language] || null
  const ready = language === 'en' || Boolean(current && !current.error)
  useEffect(() => { document.documentElement.lang = ready ? language : 'en' }, [language, ready])

  const setLanguage = (next: Language) => {
    localStorage.setItem('reabona-language', next)
    updateLanguage(next)
  }
  return <i18nContext.Provider value={{
    language,
    setLanguage,
    t: text => language === 'en' ? text : current?.translations[text] || text,
    loading: language !== 'en' && !current,
    error: current?.error || '',
    retry: () => { setResults(items => { const next = { ...items }; delete next[language]; return next }); void load(language) },
  }}>{children}</i18nContext.Provider>
}

export function LanguagePicker() {
  const { language, setLanguage, loading, error, retry } = useI18n()
  return <div className="language-picker">
    <label>Language / Puo / Taal
      <select aria-label="System language" value={language} onChange={event => {
        const next = languages.find(value => value === event.target.value)
        if (next) setLanguage(next)
      }}>
        <option value="en">English</option>
        <option value="tn">Setswana</option>
        <option value="st">Sesotho</option>
        <option value="af">Afrikaans</option>
      </select>
    </label>
    {loading && <span role="status">Loading language…</span>}
    {error && <span role="alert">{error} <button type="button" onClick={retry}>Retry</button></span>}
    {!loading && !error && language !== 'en' && <span>{translationWarnings[language]}</span>}
  </div>
}
