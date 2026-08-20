import type {
  CollageLayoutPreset,
  MediaCellPlacement,
  MediaFit,
  MediaLayout,
} from '@jrst/types';

export interface ResolvedCollageGrid {
  columns: string;
  rows: string;
  cells: MediaCellPlacement[];
}

/** Resolve collage CSS grid from layout + cell count. */
export function resolveCollageGrid(
  layout: MediaLayout | null | undefined,
  cellCount: number,
): ResolvedCollageGrid {
  const n = Math.max(1, Math.min(cellCount, 6));
  const collage = layout?.collage;
  const preset = (collage?.preset ?? 'equal') as CollageLayoutPreset;

  if (
    preset === 'custom' &&
    collage?.columns?.length &&
    collage?.cells?.length
  ) {
    return {
      columns: collage.columns.join(' '),
      rows: (collage.rows ?? ['1fr']).join(' '),
      cells: collage.cells.slice(0, n),
    };
  }

  switch (preset) {
    case 'split-70-30':
      return {
        columns: '7fr 3fr',
        rows: '1fr',
        cells: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
        ].slice(0, n),
      };
    case 'split-30-70':
      return {
        columns: '3fr 7fr',
        rows: '1fr',
        cells: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
        ].slice(0, n),
      };
    case 'hero-left': {
      const right = Math.max(1, n - 1);
      return {
        columns: '7fr 3fr',
        rows: Array.from({ length: right }, () => '1fr').join(' '),
        cells: [
          { col: 1, row: 1, rowSpan: right },
          ...Array.from({ length: right }, (_, i) => ({
            col: 2,
            row: i + 1,
          })),
        ].slice(0, n),
      };
    }
    case 'hero-right': {
      const left = Math.max(1, n - 1);
      return {
        columns: '3fr 7fr',
        rows: Array.from({ length: left }, () => '1fr').join(' '),
        cells: [
          ...Array.from({ length: left }, (_, i) => ({
            col: 1,
            row: i + 1,
          })),
          { col: 2, row: 1, rowSpan: left },
        ].slice(0, n),
      };
    }
    case 'quad-70-30':
      return {
        columns: '7fr 3fr',
        rows: '1fr 1fr',
        cells: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
          { col: 1, row: 2 },
          { col: 2, row: 2 },
        ].slice(0, n),
      };
    case 'equal':
    default: {
      if (n === 1) {
        return { columns: '1fr', rows: '1fr', cells: [{ col: 1, row: 1 }] };
      }
      if (n === 2) {
        return {
          columns: '1fr 1fr',
          rows: '1fr',
          cells: [
            { col: 1, row: 1 },
            { col: 2, row: 1 },
          ],
        };
      }
      if (n === 3) {
        return {
          columns: '1fr 1fr',
          rows: '1fr 1fr',
          cells: [
            { col: 1, row: 1, rowSpan: 2 },
            { col: 2, row: 1 },
            { col: 2, row: 2 },
          ],
        };
      }
      return {
        columns: '1fr 1fr',
        rows: '1fr 1fr',
        cells: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
          { col: 1, row: 2 },
          { col: 2, row: 2 },
        ].slice(0, n),
      };
    }
  }
}

export function mediaFrameStyle(layout: MediaLayout | null | undefined): {
  objectFit: MediaFit;
  objectPosition: string;
  scale: number;
} {
  return {
    objectFit: layout?.fit ?? 'cover',
    objectPosition: layout?.position?.trim() || 'center center',
    scale: clampScale(layout?.scale ?? 1),
  };
}

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, n));
}

export const COLLAGE_PRESET_OPTIONS: Array<{
  value: CollageLayoutPreset;
  label: string;
  hint: string;
}> = [
  { value: 'equal', label: 'Equal', hint: 'Even tiles' },
  { value: 'split-70-30', label: '70 / 30', hint: 'Wide + narrow (2)' },
  { value: 'split-30-70', label: '30 / 70', hint: 'Narrow + wide (2)' },
  { value: 'hero-left', label: 'Hero left', hint: 'Big left, stack right' },
  { value: 'hero-right', label: 'Hero right', hint: 'Stack left, big right' },
  { value: 'quad-70-30', label: 'Quad 70/30', hint: '2×2 uneven columns' },
];
