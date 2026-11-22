import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { localMapStyle } from './local-map'
import { useI18n } from './i18n-context'

export type MapCell = { latitude: number; longitude: number; category: string; count: number }

export function ManagerHeatmap({ cells }: { cells: MapCell[] }) {
  const { t } = useI18n()
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!container.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: container.current, center: [25.8, -26.5], zoom: 5.5,
        maxBounds: [[16, -35.5], [33, -22]], style: localMapStyle(),
      })
    } catch {
      queueMicrotask(() => setError(true))
      return
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('error', () => setError(true))
    map.on('load', () => {
      map.addSource('reports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: cells.map(cell => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [cell.longitude, cell.latitude] },
          properties: { count: cell.count },
        })) },
      })
      map.addLayer({ id: 'report-density', type: 'heatmap', source: 'reports', paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'count'], 0, 0, 10, 1],
        'heatmap-intensity': 1.5,
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 12, 12, 35],
        'heatmap-opacity': 0.8,
      } })
    })
    return () => map.remove()
  }, [cells])

  return <><div ref={container} className="manager-heatmap" aria-label={t('Report density map')} />
    {error && <p className="location-error" role="alert">{t('The offline map could not be displayed.')}</p>}</>
}
