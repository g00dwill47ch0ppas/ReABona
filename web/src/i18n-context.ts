import { createContext, useContext } from 'react'

export type Language = 'en' | 'tn' | 'st' | 'af'
export type I18n = {
  language: Language
  setLanguage: (language: Language) => void
  t: (text: string) => string
  loading: boolean
  error: string
  retry: () => void
}

export const i18nContext = createContext<I18n | null>(null)

export function useI18n() {
  const value = useContext(i18nContext)
  if (!value) throw new Error('Language provider is missing.')
  return value
}
