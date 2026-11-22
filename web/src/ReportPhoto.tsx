import { useI18n } from './i18n-context'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { emptyPhoto, selectPhoto, type PhotoSelection } from './photo'
import { CameraButton } from './CameraButton'

export function ReportPhoto({ value, onChange }: { value: PhotoSelection; onChange: (value: PhotoSelection) => void }) {
  const { t } = useI18n()
  const uploadRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (!value.file) {
      // oxlint-disable-next-line react/set-state-in-effect -- release the previous preview reference.
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value.file)
    // oxlint-disable-next-line react/set-state-in-effect -- tie the preview URL to the selected file.
    setPreview({ file: value.file, url })
    return () => URL.revokeObjectURL(url)
  }, [value.file])

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    onChange(selectPhoto(file))
  }

  return <div className="report-photo">
    <span className="report-photo-label">{t("Photo")} <span>{t("(optional)")}</span></span>
    <p>{t("JPEG, PNG or WebP, up to 10 MB. Photos may contain sensitive details or location metadata.")}</p>
    <div className="report-photo-actions">
      <CameraButton onChange={onChange} />
      <button type="button" className="button button-outline" onClick={() => uploadRef.current?.click()}>{t("Upload an image")}</button>
    </div>
    <input ref={uploadRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label={t("Upload an image")} aria-hidden="true" tabIndex={-1} onChange={choose} />
    {value.error && <div className="report-photo-error" role="alert">{t(value.error)} <button type="button" onClick={() => onChange(emptyPhoto)}>{t("Clear selection")}</button></div>}
    {value.file && !value.ready && <p role="status">{t("Checking image...")}</p>}
    {value.file && <div className="report-photo-preview">
      {preview?.file === value.file && <img src={preview.url} alt={t("Selected report photo")} onLoad={() => { if (!value.ready) onChange({ ...value, ready: true }) }} onError={() => onChange({ file: null, error: 'The image could not be opened. Please choose another image.', ready: true })} />}
      <span>{value.file.name}</span>
      <button type="button" onClick={() => onChange(emptyPhoto)}>{t("Remove photo")}</button>
    </div>}
  </div>
}
