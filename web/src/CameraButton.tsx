import { useI18n } from './i18n-context'
import { useEffect, useId, useRef, useState } from 'react'
import { selectPhoto, type PhotoSelection } from './photo'

export function CameraButton({ onChange, compact = false, disabled = false }: {
  onChange: (selection: PhotoSelection) => void
  compact?: boolean
  disabled?: boolean
}) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestId = useRef(0)
  const titleId = useId()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')

  const stop = () => {
    requestId.current++
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    dialogRef.current?.close()
  }

  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stop()
    }
  }, [])

  const open = async () => {
    setError('')
    setReady(false)
    setCapturing(false)
    setLoading(true)
    dialogRef.current?.showModal()
    const id = ++requestId.current
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable. Use Upload an image instead.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      if (id !== requestId.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (cameraError) {
      if (id !== requestId.current) return
      setError(cameraError instanceof DOMException && cameraError.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser or upload an image instead.'
        : cameraError instanceof Error && cameraError.message.startsWith('Camera access is unavailable')
          ? cameraError.message
          : 'Unable to open the camera. Check that it is connected and available, or upload an image instead.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight || capturing) return
    const id = requestId.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Unable to capture the photo. Please try again or upload an image.')
      return
    }
    setCapturing(true)
    try {
      context.drawImage(video, 0, 0)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (id !== requestId.current) return
      if (!blob) throw new Error('Empty image')
      onChange(selectPhoto(new File([blob], 'report-photo.jpg', { type: 'image/jpeg' })))
      stop()
    } catch {
      if (id === requestId.current) setError('Unable to capture the photo. Please try again or upload an image.')
    } finally {
      if (id === requestId.current) setCapturing(false)
    }
  }

  return <>
    <button type="button" className={compact ? 'assistant-camera' : 'button button-outline photo-camera'} aria-label={t("Take a photo")} disabled={disabled} onClick={() => void open()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.5" /></svg>
      {!compact && <span>{t("Take a photo")}</span>}
    </button>
    <dialog ref={dialogRef} className="camera-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); stop() }}>
      <h2 id={titleId}>{t("Take a photo")}</h2>
      <p>{t("Allow camera access, then capture a photo for your report.")}</p>
      <video ref={videoRef} autoPlay muted playsInline onLoadedMetadata={() => setReady(true)} onError={() => { setReady(false); setError('Unable to display the camera preview. Please try again or upload an image.') }} />
      {loading && <p role="status">{t("Opening camera…")}</p>}
      {error && <p className="camera-error" role="alert">{t(error)}</p>}
      <div className="camera-actions">
        <button type="button" className="button button-outline" onClick={stop}>{t("Cancel")}</button>
        <button type="button" className="button button-primary" disabled={!ready || loading || capturing} onClick={() => void capture()}>{t(capturing ? 'Capturing…' : 'Capture photo')}</button>
      </div>
    </dialog>
  </>
}
