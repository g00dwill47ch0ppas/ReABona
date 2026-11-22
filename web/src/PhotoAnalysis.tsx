import { useEffect, useRef, useState } from 'react'
import { useI18n } from './i18n-context'

type ReportOption = { referenceNumber: string; title: string }
type Detection = { label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }
type WorkerMessage = { type: 'status'; message: string } | { type: 'error'; message: string } | { type: 'result'; detections: Detection[] }

const guidance: Record<string, string> = {
  'a pothole in a road': 'Potential road damage: arrange a roads-team inspection and traffic protection. Repair method and equipment must be confirmed on site.',
  'a damaged water pipe': 'Potential pipe damage: refer to the water team for isolation and inspection by trained personnel.',
  'a water leak': 'Potential water leak: refer to the water team to assess isolation and repair needs.',
  'a damaged street light': 'Potential street-light damage: keep clear of electrical hazards and refer to a qualified electricity team.',
  'a pile of waste': 'Potential waste: refer to waste management to assess collection and safe handling.',
}

export function PhotoAnalysis({ reports, loadPhoto }: {
  reports: ReportOption[]
  loadPhoto: (reference: string) => Promise<string | null>
}) {
  const { t } = useI18n()
  const [reference, setReference] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [boxes, setBoxes] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const worker = useRef<Worker | null>(null)
  const request = useRef(0)
  useEffect(() => () => { request.current++; worker.current?.terminate() }, [])

  const analyze = async () => {
    if (!reference || busy) return
    const id = ++request.current
    setBusy(true); setError(''); setStatus('Loading report photo…'); setImage(null); setDetections([])
    try {
      const photo = await loadPhoto(reference)
      if (id !== request.current) return
      if (!photo) throw new Error('This report has no photo.')
      setImage(photo)
      const instance = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' })
      worker.current = instance
      instance.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (id !== request.current) return
        if (event.data.type === 'status') setStatus(event.data.message)
        else if (event.data.type === 'error') { setError(event.data.message); setStatus(''); setBusy(false); instance.terminate(); worker.current = null }
        else { setDetections(event.data.detections); setStatus(''); setBusy(false); instance.terminate(); worker.current = null }
      }
      instance.onerror = () => { if (id === request.current) { setError('Local photo analysis failed. Check that the offline photo model is installed and try again.'); setBusy(false); setStatus(''); instance.terminate(); worker.current = null } }
      instance.postMessage({ image: photo })
    } catch (reason) {
      if (id === request.current) {
        setError(reason instanceof Error ? reason.message : 'The report photo could not be loaded.')
        setStatus(''); setBusy(false)
      }
    }
  }
  return <section className="photo-analysis">
    <h2>{t('Analyze a report photo')}</h2>
    <p>{t('Analysis runs locally. Results are suggestions, not verified diagnoses; a qualified official must inspect the issue.')}</p>
    <label className="field">{t('Select a report')}<select value={reference} disabled={busy} onChange={event => {
      request.current++; worker.current?.terminate(); worker.current = null
      setReference(event.target.value); setImage(null); setDetections([]); setError(''); setStatus('')
    }}><option value="">{t('Select a report')}</option>{reports.map(report => <option key={report.referenceNumber} value={report.referenceNumber}>{report.referenceNumber} · {report.title}</option>)}</select></label>
    <button type="button" className="button button-outline" disabled={!reference || busy} onClick={() => void analyze()}>{t('Analyze photo')}</button>
    {busy && <button type="button" className="button button-outline" onClick={() => { request.current++; worker.current?.terminate(); worker.current = null; setBusy(false); setStatus(''); setImage(null) }}>{t('Cancel analysis')}</button>}
    {status && <p role="status">{t(status)}</p>}
    {error && <p className="location-error" role="alert">{t(error)}</p>}
    {image && !busy && !error && <>
      <label><input type="checkbox" checked={boxes} onChange={event => setBoxes(event.target.checked)} /> {t('Show suggested boxes')}</label>
      <div className="photo-analysis-preview"><img src={image} alt={t('Photo attached to this report')} />
        {boxes && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{detections.map((detection, index) => {
          const x = Math.max(0, Math.min(1, detection.box.xmin)) * 100
          const y = Math.max(0, Math.min(1, detection.box.ymin)) * 100
          const width = Math.max(0, Math.min(1, detection.box.xmax) * 100 - x)
          const height = Math.max(0, Math.min(1, detection.box.ymax) * 100 - y)
          return <g key={index}><rect x={x} y={y} width={width} height={height} /><text x={x} y={Math.max(3, y - 1)}>{t(detection.label)}</text></g>
        })}</svg>}
      </div>
      {detections.length ? <ul>{detections.map((item, index) => <li key={index}><b>{t('Possible')}: {t(item.label)}</b><p>{t(guidance[item.label] || 'Ask a qualified official to inspect the issue.')}</p></li>)}</ul> : <p>{t('No matching objects were detected. This does not rule out a problem.')}</p>}
    </>}
  </section>
}
