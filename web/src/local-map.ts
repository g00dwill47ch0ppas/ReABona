import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'

const protocol = new Protocol()
maplibregl.setWorkerUrl(workerUrl)
maplibregl.addProtocol('pmtiles', protocol.tile)

export function localMapStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: `${location.origin}/maps/fonts/{fontstack}/{range}.pbf`,
    sources: {
      local: {
        type: 'vector',
        url: `pmtiles://${location.origin}/maps/south-africa.pmtiles`,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#f3f1e9' } },
      { id: 'ocean', type: 'fill', source: 'local', 'source-layer': 'ocean', paint: { 'fill-color': '#bddfe9' } },
      { id: 'water', type: 'fill', source: 'local', 'source-layer': 'water_polygons', paint: { 'fill-color': '#bddfe9' } },
      { id: 'green', type: 'fill', source: 'local', 'source-layer': 'land', paint: { 'fill-color': '#dcebd8', 'fill-opacity': 0.6 } },
      { id: 'buildings', type: 'fill', source: 'local', 'source-layer': 'buildings', paint: { 'fill-color': '#d9d4c9' } },
      { id: 'roads', type: 'line', source: 'local', 'source-layer': 'streets', paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 15, 3] } },
      { id: 'places', type: 'symbol', source: 'local', 'source-layer': 'place_labels', layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 12 }, paint: { 'text-color': '#30455f', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } },
      { id: 'street-names', type: 'symbol', source: 'local', 'source-layer': 'street_labels', minzoom: 13, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 11 }, paint: { 'text-color': '#526477', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } },
    ],
  }
}
