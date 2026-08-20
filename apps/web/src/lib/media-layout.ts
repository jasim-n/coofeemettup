import type {
  CollageLayoutPreset,
  MediaCellPlacement,
  MediaFit,
  MediaLayout,
} from '@jrst/types';

/** Flex weights for one vertical stack in a masonry-columns collage. */
export type MasonryColumnWeights = number[];

export interface ResolvedCollageGrid {
  mode: 'grid' | 'masonry-columns';
  columns: string;
  rows: string;
  cells: MediaCellPlacement[];
  /**
   * Column-major stacks for `masonry-columns` mode.
   * Each inner array is top→bottom flex weights for that column.
   */
  masonryColumns?: MasonryColumnWeights[];
}

/** Resolve collage CSS grid / masonry from layout + cell count. */
export function resolveCollageGrid(
  layout: MediaLayout | null | undefined,
  cellCount: number,
): ResolvedCollageGrid {
  const n = Math.max(1, Math.min(cellCount, 9));
  const collage = layout?.collage;
  const preset = (collage?.preset ?? 'equal') as CollageLayoutPreset;

  if (preset === 'masonry-9') {
    // Template: 3 equal-width columns, staggered heights (sides 2/1/2, center 1/3/1).
    return {
      mode: 'masonry-columns',
      columns: '1fr 1fr 1fr',
      rows: '1fr',
      cells: Array.from({ length: Math.min(n, 9) }, (_, i) => ({
        col: Math.floor(i / 3) + 1,
        row: (i % 3) + 1,
      })),
      masonryColumns: [
        [2, 1, 2],
        [1, 3, 1],
        [2, 1, 2],
      ],
    };
  }

  if (
    preset === 'custom' &&
    collage?.columns?.length &&
    collage?.cells?.length
  ) {
    return {
      mode: 'grid',
      columns: collage.columns.join(' '),
      rows: (collage.rows ?? ['1fr']).join(' '),
      cells: collage.cells.slice(0, n),
    };
  }

  switch (preset) {
    case 'split-70-30':
      return {
        mode: 'grid',
        columns: '7fr 3fr',
        rows: '1fr',
        cells: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
        ].slice(0, n),
      };
    case 'split-30-70':
      return {
        mode: 'grid',
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
        mode: 'grid',
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
        mode: 'grid',
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
        mode: 'grid',
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
        return {
          mode: 'grid',
          columns: '1fr',
          rows: '1fr',
          cells: [{ col: 1, row: 1 }],
        };
      }
      if (n === 2) {
        return {
          mode: 'grid',
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
          mode: 'grid',
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
        mode: 'grid',
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
  { value: 'masonry-9', label: 'Masonry 9', hint: 'Staggered 3×3 template' },
  { value: 'equal', label: 'Equal', hint: 'Even tiles' },
  { value: 'split-70-30', label: '70 / 30', hint: 'Wide + narrow (2)' },
  { value: 'split-30-70', label: '30 / 70', hint: 'Narrow + wide (2)' },
  { value: 'hero-left', label: 'Hero left', hint: 'Big left, stack right' },
  { value: 'hero-right', label: 'Hero right', hint: 'Stack left, big right' },
  { value: 'quad-70-30', label: 'Quad 70/30', hint: '2×2 uneven columns' },
];
