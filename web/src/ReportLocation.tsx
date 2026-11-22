import { useEffect, useEffectEvent, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { localMapStyle } from './local-map'
import { useI18n } from './i18n-context'

type Point = { latitude: number; longitude: number }
type Mode = 'map' | 'manual'

const withinMap = ({ latitude, longitude }: Point) =>
  latitude >= -35.5 && latitude <= -22 && longitude >= 16 && longitude <= 33

function formatPoint(point: Point) {
  return `GPS: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
}

function LocationMap({ point, onPick }: { point: Point | null; onPick: (point: Point) => void }) {
  const { t } = useI18n()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const [mapError, setMapError] = useState(false)
  const handlePick = useEffectEvent(onPick)

  useEffect(() => {
    if (!container.current) return
    let map: MapLibreMap
    try {
      map = new maplibregl.Map({
        container: container.current,
        center: [25, -29],
        zoom: 4.7,
        minZoom: 4,
        maxZoom: 18,
        maxBounds: [[16, -35.5], [33, -22]],
        attributionControl: false,
        style: localMapStyle(),
      })
    } catch {
      queueMicrotask(() => setMapError(true))
      return
    }
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('error', () => setMapError(true))
    map.on('click', event => handlePick({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }))
    return () => { markerRef.current = null; mapRef.current = null; map.remove() }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!point) { markerRef.current?.remove(); markerRef.current = null; return }
    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ color: '#c83e31', draggable: true }).setLngLat([point.longitude, point.latitude]).addTo(map)
      marker.on('dragend', () => {
        const position = marker.getLngLat()
        handlePick({ latitude: position.lat, longitude: position.lng })
      })
      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([point.longitude, point.latitude])
    }
    if (!map.getBounds().contains([point.longitude, point.latitude]) || map.getZoom() < 12) {
      map.flyTo({ center: [point.longitude, point.latitude], zoom: 15 })
    }
  }, [point])

  return <div className="location-map-wrap">
    <div ref={container} className="location-map" aria-label={t('Map of South Africa. Click the map to place a pin.')} />
    <button type="button" className="button button-outline" disabled={!point || mapError} onClick={() => {
      if (point) mapRef.current?.flyTo({ center: [point.longitude, point.latitude] })
    }}>{t('Center map')}</button>
    {mapError && <p className="location-error" role="alert">{t('The offline map could not be loaded. You can still enter a location manually.')}</p>}
  </div>
}

export function ReportLocation({ onChange }: { onChange: (location: string) => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('map')
  const [point, setPoint] = useState<Point | null>(null)
  const [manual, setManual] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'unavailable' | 'outside'>('loading')
  const [attempt, setAttempt] = useState(0)
  const generation = useRef(0)
  const updateLocation = useEffectEvent(onChange)

  useEffect(() => {
    if (mode !== 'map') return
    const counter = generation
    const request = ++counter.current
    if (!navigator.geolocation) {
      queueMicrotask(() => { if (counter.current === request) setStatus('unavailable') })
      return () => { counter.current++ }
    }
    navigator.geolocation.getCurrentPosition(position => {
      if (counter.current !== request) return
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      if (!withinMap(next)) { setStatus('outside'); return }
      setPoint(next)
      updateLocation(formatPoint(next))
      setStatus('ready')
    }, error => {
      if (counter.current !== request) return
      setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
    return () => { counter.current++ }
  }, [mode, attempt])

  const chooseMode = (next: Mode) => {
    generation.current++
    setMode(next)
    if (next === 'manual') {
      onChange(manual)
    } else {
      setPoint(null)
      setStatus('loading')
      onChange('')
    }
  }
  const pick = (next: Point) => {
    generation.current++
    setPoint(next)
    setStatus('ready')
    onChange(formatPoint(next))
  }

  return <fieldset className="location-field field-wide">
    <legend>{t('Where is it happening?')}</legend>
    <div className="location-modes">
      <label><input type="radio" name="locationMode" checked={mode === 'map'} onChange={() => chooseMode('map')} /> {t('Use GPS or place a pin')}</label>
      <label><input type="radio" name="locationMode" checked={mode === 'manual'} onChange={() => chooseMode('manual')} /> {t('Type a location')}</label>
    </div>
    {mode === 'map' ? <>
      <p>{t('GPS uses your current location. Move or place the pin if the issue is elsewhere. The map is stored locally.')}</p>
      {status === 'loading' && <p role="status">{t('Finding your location…')}</p>}
      {status === 'denied' && <p className="location-error" role="alert">{t('Location permission was denied. Place a pin or type a location instead.')}</p>}
      {status === 'unavailable' && <p className="location-error" role="alert">{t('GPS is unavailable. Place a pin or type a location instead.')}</p>}
      {status === 'outside' && <p className="location-error" role="alert">{t('Your GPS location is outside the offline South Africa map. Type a location instead.')}</p>}
      <LocationMap point={point} onPick={pick} />
      {point && <p>{t('Selected coordinates')}: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>}
      <button type="button" className="location-retry" onClick={() => { generation.current++; setPoint(null); onChange(''); setStatus('loading'); setAttempt(value => value + 1) }}>{t('Find my location again')}</button>
    </> : <label className="field">{t('Address or location')}<input value={manual} required maxLength={300} placeholder={t('Street, suburb, school or landmark')} onChange={event => { setManual(event.target.value); onChange(event.target.value) }} /></label>}
  </fieldset>
}
