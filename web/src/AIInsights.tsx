import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useI18n, type Language } from './i18n-context'
import { detectPhotoLabels } from './photo-detection'

type InsightResult = { insights: string[] }

export function CaseInsights({ title, description, photo, send }: {
  title: string
  description: string
  photo: string | null
  send: (input: { reviewedText: string; photoLabels: string[]; language: Language }, signal: AbortSignal) => Promise<InsightResult>
}) {
  const { t, language } = useI18n()
  const [text, setText] = useState(`${title}\n${description}`)
  const [reviewed, setReviewed] = useState(false)
  const [includePhoto, setIncludePhoto] = useState(Boolean(photo))
  const [result, setResult] = useState<(InsightResult & { language: Language }) | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => { controller.current?.abort() }, [language])
  const invalidate = () => {
    controller.current?.abort(); controller.current = null
    setBusy(false); setResult(null); setStatus(''); setError('')
  }
  const generate = async () => {
    const request = new AbortController()
    controller.current = request
    setBusy(true); setResult(null); setError('')
    try {
      const photoLabels = includePhoto && photo ? await detectPhotoLabels(photo, request.signal, setStatus) : []
      request.signal.throwIfAborted()
      if (!text.trim() && !photoLabels.length) throw new Error('Provide reviewed case text or detected photo labels.')
      setStatus('Generating AI insights…')
      const output = await send({ reviewedText: text.trim(), photoLabels, language }, request.signal)
      request.signal.throwIfAborted()
      setResult({ ...output, language })
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'AI insights could not be generated. Please try again.')
    } finally {
      if (controller.current === request) { controller.current = null; setBusy(false); setStatus('') }
    }
  }
  return <div className="case-ai-insights">
    <h3>{t('ReaBona AI insights')}</h3>
    <p>{t('Review and remove personal or sensitive details before sending this text to Azure AI. The photo stays on this device; only detected labels are sent.')}</p>
    <label className="field">{t('Reviewed case text')}<textarea value={text} maxLength={5500} rows={4} onChange={event => { invalidate(); setReviewed(false); setText(event.target.value) }} /></label>
    {photo && <label><input type="checkbox" checked={includePhoto} onChange={event => { invalidate(); setIncludePhoto(event.target.checked) }} /> {t('Use photo for local issue detection')}</label>}
    <label><input type="checkbox" checked={reviewed} onChange={event => { if (!event.target.checked) invalidate(); setReviewed(event.target.checked) }} /> {t('I reviewed the text and removed sensitive details.')}</label>
    <button className="button button-outline" type="button" disabled={!reviewed || busy || (!text.trim() && !includePhoto)} onClick={() => void generate()}>{t('Get AI insights')}</button>
    {busy && <button className="button button-outline" type="button" onClick={invalidate}>{t('Cancel analysis')}</button>}
    {status && <p role="status">{t(status)}</p>}
    {error && <p className="location-error" role="alert">{t(error)}</p>}
    {result?.language === language && <><p>{t('AI suggestions may be inaccurate and require professional review.')}</p><ul>{result.insights.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
  </div>
}

export function ManagerInsights({ send }: { send: (language: Language, signal: AbortSignal) => Promise<InsightResult> }) {
  const { t, language } = useI18n()
  const [outcome, setOutcome] = useState<{ language: Language; result: InsightResult | null; error: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const load = useEffectEvent(async (signal: AbortSignal) => {
    try {
      const value = await send(language, signal)
      if (!signal.aborted) setOutcome({ language, result: value, error: '' })
    } catch (reason) {
      if (!signal.aborted) setOutcome({ language, result: null, error: reason instanceof Error ? reason.message : 'AI insights could not be generated. Please try again.' })
    }
  })
  useEffect(() => {
    const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect -- load aggregate insights asynchronously when the dashboard opens.
    void load(controller.signal)
    return () => controller.abort()
  }, [language, attempt])
  const current = outcome?.language === language ? outcome : null
  return <section className="panel manager-ai-insights"><h3>{t('ReaBona AI insights')}</h3>
    <p>{t('Generated from aggregate case statistics. AI suggestions may be inaccurate and require review.')}</p>
    {current?.error ? <p role="alert">{t(current.error)} <button type="button" onClick={() => { setOutcome(null); setAttempt(value => value + 1) }}>{t('Retry')}</button></p> : current?.result ? <ul>{current.result.insights.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p role="status">{t('Generating AI insights…')}</p>}
  </section>
}
