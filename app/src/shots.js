// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo loaded;
// ?shot=cover shows the cover alone, drawn at the window's size. The query picks the
// layout, grade, size, words and the photos for the slots, so every screenshot is
// reproducible from its line in shots.json. window.__shotReady is set once painted.

/**
 * Runs one shot scene. `hooks` is the editor's own API: setState merges a patch into
 * the state, applyPhotos resolves every slot's photo, redraw repaints the page.
 */
export async function runShot(shot, query, hooks) {
  const layout = query.get('layout') ?? 'vice-grid';
  const preset = query.get('preset') ?? 'vice-neon';
  const size = query.get('size') ?? '1080x1080';
  const title = query.get('title') ?? 'VICE CITY';
  const subtitle = query.get('subtitle') ?? 'Sunset Heist';
  const credits = query.get('credits') ?? 'A LEONIDA STORY';
  const names = (query.get('photos') ?? query.get('photo') ?? 'pier')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const slots = Array.from({ length: 9 }, (_, i) => ({
    src: names[i % names.length],
    zoom: 1.12,
    ox: 0,
    oy: 0.15,
    treatment: 'auto',
  }));
  hooks.setState({ layout, preset, size, title, subtitle, credits, slots });
  await hooks.applyPhotos();
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch {
    // The system faces still draw.
  }
  hooks.redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
