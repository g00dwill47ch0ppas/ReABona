import { useI18n } from './i18n-context'
export function VoiceLanguage({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const { t } = useI18n()
  return <label className="voice-language">{t("Spoken language")}
    <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled}>
      <option value="en">English</option>
      <option value="af">Afrikaans</option>
      <option value="tn" disabled>{t('Setswana (voice unavailable)')}</option>
      <option value="st" disabled>{t('Sesotho (voice unavailable)')}</option>
    </select>
  </label>
}
