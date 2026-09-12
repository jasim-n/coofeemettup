import type { ExpressionSpecification, Map as MaplibreMap } from 'maplibre-gl';

/** Prefer English / Latin script labels over local names (e.g. Urdu). */
export const ENGLISH_LABEL_EXPRESSION: ExpressionSpecification = [
  'coalesce',
  ['get', 'name:en'],
  ['get', 'name:latin'],
  ['get', 'name_en'],
  ['get', 'name'],
];

function layerUsesName(textField: unknown): boolean {
  return JSON.stringify(textField ?? '').includes('name');
}

/** Rewrites OpenMapTiles symbol layers to English-first labels. */
export function applyEnglishMapLabels(map: MaplibreMap): void {
  if (!map.isStyleLoaded()) return;
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  for (const layer of layers) {
    if (layer.type !== 'symbol') continue;
    const textField = layer.layout?.['text-field'];
    if (textField == null || !layerUsesName(textField)) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', ENGLISH_LABEL_EXPRESSION);
    } catch {
      /* layer not ready yet */
    }
  }
}

/** Apply English labels on load and whenever the style reloads. Returns cleanup. */
export function bindMapEnglishLabels(map: MaplibreMap): () => void {
  const onStyle = () => applyEnglishMapLabels(map);
  onStyle();
  map.on('styledata', onStyle);
  return () => map.off('styledata', onStyle);
}
