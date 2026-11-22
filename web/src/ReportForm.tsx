import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { useI18n, type Language } from './i18n-context'
import { ReportPhoto } from './ReportPhoto'
import { readPhoto, type PhotoSelection } from './photo'
import { detectPhotoLabels } from './photo-detection'
import { VoiceButton } from './VoiceButton'
import { VoiceLanguage } from './VoiceLanguage'
import { appendTranscript, type VoiceStatus } from './voice'

const ReportLocation = lazy(() => import('./ReportLocation').then(module => ({ default: module.ReportLocation })))

type Category = { categoryId: number; categoryName: string }
type Suggestion = { categoryId: number | null; description: string | null }
export function ReportForm({ categories, initialCategoryId, photo, onPhotoChange, description, onDescriptionChange,
  location, onLocationChange, voice, onVoiceStatus, voiceLanguage, onVoiceLanguageChange, busy, onSubmit, suggest }: {
  categories: Category[]
  initialCategoryId: string
  photo: PhotoSelection
  onPhotoChange: (value: PhotoSelection) => void
  description: string
  onDescriptionChange: (value: string) => void
  location: string
  onLocationChange: (value: string) => void
  voice: VoiceStatus
  onVoiceStatus: (value: VoiceStatus) => void
  voiceLanguage: string
  onVoiceLanguageChange: (value: string) => void
  busy: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  suggest: (input: { title: string; photoLabels: string[]; language: Language }, signal: AbortSignal) => Promise<Suggestion>
}) {
  const { t, language } = useI18n()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(initialCategoryId)
  const [includePhoto, setIncludePhoto] = useState(true)
  const [suggestion, setSuggestion] = useState<(Suggestion & { language: Language }) | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [noMatches, setNoMatches] = useState(false)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => { request.current?.abort() }, [language])

  const invalidate = () => {
    request.current?.abort()
    request.current = null
    setSuggesting(false)
    setSuggestion(null)
    setStatus('')
    setError('')
    setNoMatches(false)
  }
  const generate = async () => {
    const controller = new AbortController()
    request.current = controller
    setSuggesting(true); setSuggestion(null); setError(''); setStatus(''); setNoMatches(false)
    try {
      const image = includePhoto && photo.file ? await readPhoto(photo.file) : null
      controller.signal.throwIfAborted()
      const labels = image ? await detectPhotoLabels(image, controller.signal, setStatus) : []
      controller.signal.throwIfAborted()
      if (includePhoto && photo.file && !labels.length && title.trim()) setNoMatches(true)
      if (!title.trim() && !labels.length) throw new Error('Enter a title or provide a photo with detectable issue details.')
      setStatus('Generating AI suggestions…')
      const result = await suggest({ title: title.trim(), photoLabels: labels, language }, controller.signal)
      controller.signal.throwIfAborted()
      setSuggestion({ ...result, language })
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'AI suggestions could not be generated. Please try again.')
    } finally {
      if (request.current === controller) { request.current = null; setSuggesting(false); setStatus('') }
    }
  }
  const current = suggestion?.language === language ? suggestion : null
  const suggestedCategory = categories.find(item => item.categoryId === current?.categoryId)

  return <form className="panel report-form" onSubmit={onSubmit}>
    <div className="form-grid">
      <label className="field field-wide">{t('Report title')}<input name="title" value={title} onChange={event => { invalidate(); setTitle(event.target.value) }} required maxLength={200} placeholder={t('e.g. No water at Metsi Primary School')} /></label>
      <div className="field-wide"><ReportPhoto value={photo} onChange={value => { invalidate(); onPhotoChange(value) }} /></div>
      <div className="field-wide report-suggestions">
        <p>{t('AI suggestions are optional. Your title and any locally detected issue labels are sent to Azure AI; your photo stays on this device. Avoid sensitive information.')}</p>
        {photo.file && <p>{t('Photo analysis detects a limited set of objects; it does not read text. Results may be inaccurate.')}</p>}
        {photo.file && <label className="suggestion-photo-option"><input type="checkbox" checked={includePhoto} onChange={event => { invalidate(); setIncludePhoto(event.target.checked) }} /> {t('Use photo for local issue detection')}</label>}
        <button type="button" className="button button-outline" disabled={suggesting || busy || Boolean(photo.error) || !photo.ready || (!title.trim() && !(includePhoto && photo.file))} onClick={() => void generate()}>{t('Get AI suggestions')}</button>
        {suggesting && <button type="button" className="button button-outline" onClick={invalidate}>{t('Cancel analysis')}</button>}
        {status && <p role="status">{t(status)}</p>}
        {noMatches && <p>{t('No matching objects were detected in the photo. The suggestion uses the title only.')}</p>}
        {error && <p className="location-error" role="alert">{t(error)}</p>}
        {current && !current.categoryId && !current.description && <p>{t('No suggestion is available. Please complete the fields yourself.')}</p>}
      </div>
      <div className="field">
        <label htmlFor="report-category">{t('Issue category')}</label>
        <select id="report-category" name="categoryId" value={category} onChange={event => setCategory(event.target.value)} required><option value="" disabled>{t('Select a category')}</option>{categories.map(item => <option value={item.categoryId} key={item.categoryId}>{t(item.categoryName)}</option>)}</select>
        {suggestedCategory && <div className="suggestion-card"><strong>{t('AI suggestion')}</strong>: {t(suggestedCategory.categoryName)} <button type="button" onClick={() => setCategory(String(suggestedCategory.categoryId))}>{t('Use suggested category')}</button></div>}
      </div>
      <Suspense fallback={<p role="status">{t('Loading the location picker…')}</p>}><ReportLocation onChange={onLocationChange} /></Suspense>
      <div className="field field-wide"><label htmlFor="report-description">{t('Describe the issue')}</label><div className="description-control"><textarea id="report-description" name="description" value={description} onChange={event => onDescriptionChange(event.target.value)} rows={5} required maxLength={5000} placeholder={t('What happened, when did it start, and who is affected?')} /><VoiceButton className="description-microphone" language={voiceLanguage} disabled={busy} onStatus={onVoiceStatus} onText={text => {
        const next = appendTranscript(description, text, 5000)
        if (next === null) return 'Transcription exceeds the 5,000-character limit. Shorten the description and try again.'
        onDescriptionChange(next)
        return null
      }} /></div>
        {current?.description && <div className="suggestion-card"><strong>{t('AI-suggested description')}</strong><p>{current.description}</p><button type="button" onClick={() => onDescriptionChange(current.description || '')}>{t(description ? 'Replace description with suggestion' : 'Use suggested description')}</button></div>}
        <VoiceLanguage value={voiceLanguage} onChange={onVoiceLanguageChange} disabled={voice.active || busy} />{voice.message && <p className={`voice-status ${voice.error ? 'voice-error' : ''}`} role={voice.error ? 'alert' : 'status'}>{t(voice.message)}</p>}
      </div>
    </div>
    <div className="form-footer"><span>{t('All text fields are required. Please do not include sensitive personal information.')}</span><button className="button button-primary" disabled={busy || Boolean(photo.error) || !photo.ready || voice.active || !location.trim()}>{t(busy ? 'Submitting…' : 'Submit report')} <span aria-hidden="true">→</span></button></div>
  </form>
}
