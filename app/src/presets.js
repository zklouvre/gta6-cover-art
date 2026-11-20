// Vice Cover Studio: the named colour grades, cover layouts, export sizes and photo
// treatments. Everything here is data the renderer (cover.js) and the editor (main.js)
// share, so a new grade or layout is one entry, not a code change.

/** A colour grade: the palette the whole cover is painted from. */
export const PRESETS = {
  'vice-neon': {
    name: 'Vice City Neon',
    tag: 'Hot pink + cyan',
    bg: ['#1d0b33', '#0a0518'],
    band: '#150a26',
    rule: '#ff2e88',
    accent: '#19e3d6',
    title: ['#ffe259', '#ff7a18', '#ff2e88'],
    outline: '#160a2e',
    subtitle: '#19e3d6',
    subtitleScript: true,
    credits: '#cdbcf0',
    treatment: 'neon',
    duoDark: '#3b0a5e',
    duoLight: '#19e3d6',
    glow: '#ff2e88',
    badge: 'LEONIDA',
  },
  'sunset-blvd': {
    name: 'Sunset Boulevard',
    tag: 'Golden hour',
    bg: ['#2e1220', '#120814'],
    band: '#22101c',
    rule: '#ff7a18',
    accent: '#ffd166',
    title: ['#fff3b0', '#ffb347', '#ff4e6d'],
    outline: '#2a0e1e',
    subtitle: '#ffd166',
    subtitleScript: true,
    credits: '#e8c9a8',
    treatment: 'sunset',
    duoDark: '#4a1030',
    duoLight: '#ffd166',
    glow: '#ff7a18',
    badge: 'VICE CITY',
  },
  'leonida-nights': {
    name: 'Leonida Nights',
    tag: 'Midnight blue',
    bg: ['#0a1230', '#05070f'],
    band: '#0b1030',
    rule: '#19e3d6',
    accent: '#7b61ff',
    title: ['#a5f3fc', '#38bdf8', '#7b61ff'],
    outline: '#060a1e',
    subtitle: '#7dd3fc',
    subtitleScript: false,
    credits: '#9db4d8',
    treatment: 'night',
    duoDark: '#0a1230',
    duoLight: '#38bdf8',
    glow: '#19e3d6',
    badge: 'NIGHT DRIVE',
  },
  noir: {
    name: 'Noir',
    tag: 'Black + white',
    bg: ['#161616', '#050505'],
    band: '#0d0d0d',
    rule: '#f5f5f5',
    accent: '#d4d4d4',
    title: ['#ffffff', '#e5e5e5', '#9ca3af'],
    outline: '#000000',
    subtitle: '#f5f5f5',
    subtitleScript: false,
    credits: '#a3a3a3',
    treatment: 'noir',
    duoDark: '#111111',
    duoLight: '#ffffff',
    glow: '#ffffff',
    badge: 'NOIR',
  },
  'palm-gold': {
    name: 'Palm Gold',
    tag: 'Warm vintage',
    bg: ['#241708', '#0f0a04'],
    band: '#1d130a',
    rule: '#ffd166',
    accent: '#2ec4b6',
    title: ['#fff8dc', '#ffd166', '#e07a2f'],
    outline: '#241505',
    subtitle: '#ffd166',
    subtitleScript: true,
    credits: '#d9b380',
    treatment: 'gold',
    duoDark: '#3d2408',
    duoLight: '#ffe9a8',
    glow: '#ffd166',
    badge: 'PALM ROW',
  },
};

/** The cover layouts. `panels` is how many photo slots the layout shows. */
export const LAYOUTS = {
  'vice-grid': { name: 'Vice Grid', panels: 4, blurb: 'Four-panel poster grid' },
  diagonal: { name: 'Diagonal Split', panels: 2, blurb: 'Two panels cut on a neon diagonal' },
  'hero-strip': { name: 'Hero + Strip', panels: 4, blurb: 'One hero frame over a photo strip' },
  single: { name: 'Single Frame', panels: 1, blurb: 'One full-bleed photo' },
  'nine-grid': { name: 'Nine Grid', panels: 9, blurb: 'A 3 × 3 contact-sheet grid' },
  tilted: { name: 'Tilted Snaps', panels: 3, blurb: 'Three tilted snapshots' },
};

/** The export sizes, in the common post sizes the bounty names. */
export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square', dims: '1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait', dims: '1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide', dims: '1920 × 1080' },
};

/** The photo treatments a slot can take. `auto` follows the preset's grade. */
export const TREATMENTS = {
  auto: 'Preset grade',
  none: 'Original photo',
  sunset: 'Sunset wash',
  duotone: 'Duotone',
  neon: 'Neon pop',
  night: 'Night grade',
  gold: 'Palm gold',
  noir: 'Noir',
  comic: 'Comic ink',
  halftone: 'Halftone print',
};

/** The sample photos shipped under app/samples/. */
export const SAMPLES = {
  pier: { name: 'Pier', file: 'samples/pier.jpg' },
  boulevard: { name: 'Boulevard', file: 'samples/boulevard.jpg' },
};

/** The default slot photos, alternating the two samples across the nine slots. */
export function defaultSlots() {
  const names = ['pier', 'boulevard'];
  return Array.from({ length: 9 }, (_, i) => ({
    src: names[i % 2],
    zoom: 1.12,
    ox: 0,
    oy: 0.15,
    treatment: 'auto',
  }));
}

/** The fresh editor state: the cover a first-time visitor sees. */
export function defaultState() {
  return {
    layout: 'vice-grid',
    preset: 'vice-neon',
    size: '1080x1080',
    title: 'VICE CITY',
    subtitle: 'Sunset Heist',
    credits: 'A LEONIDA STORY',
    slots: defaultSlots(),
  };
}
