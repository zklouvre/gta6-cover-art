// Vice Cover Studio: the cover renderer. drawCover paints a whole GTA VI-style poster
// (multi-panel photo collage, colour grade, bold display title, subtitle and credits)
// onto a canvas at the canvas's own size, so the live preview and the exported PNG are
// the same drawing. Everything is plain Canvas 2D, offline, no network, no library.

import { LAYOUTS, PRESETS } from './presets.js';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A cached film-grain tile, drawn tiled over the cover at low alpha. */
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 180;
  const n = c.getContext('2d');
  const img = n.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  n.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** A grid of dots that grows across the strip: the print halftone of a poster. */
function halftoneStrip(ctx, x, y, w, h, color, alpha, gap, maxR) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let yy = y + gap / 2; yy < y + h; yy += gap) {
    for (let xx = x + gap / 2; xx < x + w; xx += gap) {
      const t = (xx - x) / Math.max(1, w);
      const r = Math.max(0.6, maxR * (0.3 + 0.7 * t));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain over the whole cover, barely there. */
function drawGrain(ctx, w, h) {
  const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft darkening of the edges, so the middle of the poster pops. */
function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Layout geometry: every panel as a rectangle (with an optional clip polygon or
// rotation), plus where the title block lives.
// ---------------------------------------------------------------------------

/**
 * Returns { panels, title, seam } for a layout at size W x H.
 * A panel is { x, y, w, h, rot?, clip?, polaroid? }; the title is
 * { mode: 'band' | 'overlay', x, y, w, h }; a seam is [[x1, y1], [x2, y2]].
 */
export function layoutPanels(layout, W, H) {
  const m = Math.round(Math.min(W, H) * 0.03);
  const g = Math.round(Math.min(W, H) * 0.018);
  const titleH = Math.round(H * 0.205);
  const bandY = H - titleH;
  const top = m;
  const bottom = bandY - m;
  const areaW = W - 2 * m;
  const areaH = bottom - top;
  const band = { mode: 'band', x: 0, y: bandY, w: W, h: titleH };
  const overlay = { mode: 'overlay', x: 0, y: Math.round(H * 0.6), w: W, h: H - Math.round(H * 0.6) };

  switch (layout) {
    case 'vice-grid': {
      const cw = (areaW - g) / 2;
      const ch = (areaH - g) / 2;
      const panels = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          panels.push({ x: m + col * (cw + g), y: top + row * (ch + g), w: cw, h: ch });
        }
      }
      return { panels, title: band, seam: null };
    }
    case 'diagonal': {
      // Two panels side by side, cut by a slanted neon seam: each panel stays
      // near-square, so faces survive the crop.
      const seamTop = W * 0.54;
      const seamBot = W * 0.44;
      const panels = [
        { x: m, y: top, w: seamTop - m, h: areaH, clip: [[m, top], [seamTop, top], [seamBot, bottom], [m, bottom]] },
        { x: seamBot, y: top, w: W - m - seamBot, h: areaH, clip: [[seamTop, top], [W - m, top], [W - m, bottom], [seamBot, bottom]] },
      ];
      return { panels, title: band, seam: [[seamTop, top], [seamBot, bottom]] };
    }
    case 'hero-strip': {
      const heroH = areaH * 0.6;
      const hero = { x: m, y: top, w: areaW, h: heroH };
      const stripY = top + heroH + g;
      const stripH = bottom - stripY;
      const sw = (areaW - 2 * g) / 3;
      const panels = [hero];
      for (let i = 0; i < 3; i++) panels.push({ x: m + i * (sw + g), y: stripY, w: sw, h: stripH });
      return { panels, title: band, seam: null };
    }
    case 'single': {
      return { panels: [{ x: 0, y: 0, w: W, h: H }], title: overlay, seam: null };
    }
    case 'nine-grid': {
      const cw = (areaW - 2 * g) / 3;
      const ch = (areaH - 2 * g) / 3;
      const panels = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          panels.push({ x: m + col * (cw + g), y: top + row * (ch + g), w: cw, h: ch });
        }
      }
      return { panels, title: band, seam: null };
    }
    case 'tilted': {
      const snapW = areaW * 0.52;
      const snapH = areaH * 0.76;
      const cy = top + areaH * 0.44;
      const centers = [W * 0.25, W * 0.5, W * 0.75];
      const rots = [-0.12, 0.03, 0.1];
      const panels = centers.map((cx, i) => ({
        x: cx - snapW / 2,
        y: cy - snapH / 2,
        w: snapW,
        h: snapH,
        rot: rots[i],
        polaroid: true,
      }));
      return { panels, title: band, seam: null };
    }
    default:
      return layoutPanels('vice-grid', W, H);
  }
}

/** Which panel index holds point (px, py), or -1. Handles rotation and polygons. */
export function panelAt(layout, W, H, px, py) {
  const { panels } = layoutPanels(layout, W, H);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.rot) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const cos = Math.cos(-p.rot);
      const sin = Math.sin(-p.rot);
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= p.w / 2 + 14 && Math.abs(ly) <= p.h / 2 + 22) return i;
    } else if (p.clip) {
      if (pointInPolygon(px, py, p.clip)) return i;
    } else if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Photo treatments
// ---------------------------------------------------------------------------

/** The canvas filter a treatment paints its photo through. */
function filterFor(treatment) {
  switch (treatment) {
    case 'sunset': return 'saturate(1.3) contrast(1.06) brightness(1.02)';
    case 'duotone': return 'grayscale(1) contrast(1.18) brightness(1.06)';
    case 'neon': return 'saturate(1.9) contrast(1.16)';
    case 'night': return 'saturate(0.85) brightness(0.82) contrast(1.12) hue-rotate(-12deg)';
    case 'gold': return 'sepia(0.38) saturate(1.35) contrast(1.08)';
    case 'noir': return 'grayscale(1) contrast(1.55) brightness(1.04)';
    case 'comic': return 'saturate(1.7) contrast(1.75) brightness(1.02)';
    case 'halftone': return 'saturate(1.25) contrast(1.25)';
    default: return 'none';
  }
}

/** The colour overlays a treatment lays over its photo, in panel space. */
function treatmentOverlays(ctx, ox, oy, w, h, treatment, preset) {
  ctx.save();
  switch (treatment) {
    case 'sunset': {
      const g = ctx.createLinearGradient(ox, oy, ox, oy + h);
      g.addColorStop(0, 'rgba(255,120,60,0)');
      g.addColorStop(0.55, 'rgba(255,110,60,0.18)');
      g.addColorStop(1, 'rgba(255,45,120,0.38)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'duotone': {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = preset.duoDark;
      ctx.fillRect(ox, oy, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = preset.duoLight;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'neon': {
      const g = ctx.createLinearGradient(ox, oy, ox, oy + h);
      g.addColorStop(0, 'rgba(255,46,136,0.16)');
      g.addColorStop(1, 'rgba(25,227,214,0.16)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'night': {
      ctx.fillStyle = 'rgba(8,12,48,0.26)';
      ctx.fillRect(ox, oy, w, h);
      const g = ctx.createLinearGradient(ox, oy + h, ox, oy);
      g.addColorStop(0, 'rgba(25,227,214,0.14)');
      g.addColorStop(1, 'rgba(25,227,214,0)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'gold': {
      ctx.fillStyle = 'rgba(255,180,60,0.12)';
      ctx.fillRect(ox, oy, w, h);
      const g = ctx.createLinearGradient(ox, oy, ox, oy + h);
      g.addColorStop(0, 'rgba(255,200,90,0)');
      g.addColorStop(1, 'rgba(224,122,47,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'noir': {
      const g = ctx.createRadialGradient(
        ox + w / 2, oy + h / 2, Math.min(w, h) * 0.3,
        ox + w / 2, oy + h / 2, Math.max(w, h) * 0.75,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, w, h);
      break;
    }
    case 'comic':
      halftoneStrip(ctx, ox, oy + h * 0.55, w, h * 0.45, '#111111', 0.12, Math.max(7, w * 0.02), Math.max(2.5, w * 0.008));
      break;
    case 'halftone':
      halftoneStrip(ctx, ox, oy, w, h, '#111111', 0.2, Math.max(8, w * 0.022), Math.max(2.5, w * 0.009));
      break;
    default:
      break;
  }
  ctx.restore();
}

/** Draws one photo (cover-fit, zoomed and offset by its slot) into the panel. */
function drawPhotoPanel(ctx, panel, img, slot, preset, W) {
  const { w, h } = panel;
  const treatment = slot.treatment === 'auto' ? preset.treatment : slot.treatment;
  ctx.save();
  // A tilted snapshot gets a polaroid backing first, then the photo on top.
  if (panel.rot) {
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.rot);
    ctx.translate(-panel.w / 2, -panel.h / 2);
    const pad = Math.max(8, w * 0.025);
    const bottomPad = pad * 2.4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = Math.max(10, w * 0.04);
    ctx.shadowOffsetY = Math.max(6, w * 0.02);
    ctx.fillStyle = '#fdfbf6';
    ctx.fillRect(-pad, -pad, w + 2 * pad, h + 2 * pad + bottomPad);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    drawPhotoInto(ctx, img, slot, 0, 0, w, h, treatment, preset);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  if (panel.clip) {
    panel.clip.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
  } else {
    ctx.rect(panel.x, panel.y, w, h);
  }
  ctx.clip();
  drawPhotoInto(ctx, img, slot, panel.x, panel.y, w, h, treatment, preset);
  ctx.restore();
  // The frame: a bright keyline, glowing on the neon grades, ink-heavy on comic.
  const keyline = Math.max(2, W * 0.0016);
  ctx.save();
  ctx.beginPath();
  if (panel.clip) {
    panel.clip.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.closePath();
  } else {
    ctx.rect(panel.x, panel.y, w, h);
  }
  if (treatment === 'comic') {
    ctx.lineWidth = Math.max(5, W * 0.007);
    ctx.strokeStyle = '#111111';
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, W * 0.0012);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
  } else {
    ctx.lineWidth = keyline;
    ctx.strokeStyle = preset.rule;
    ctx.globalAlpha = 0.85;
    if (preset.treatment === 'neon' || treatment === 'neon') {
      ctx.shadowColor = preset.glow;
      ctx.shadowBlur = Math.max(8, W * 0.012);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The photo itself, cover-fit inside (ox, oy, w, h), plus its treatment overlays. */
function drawPhotoInto(ctx, img, slot, ox, oy, w, h, treatment, preset) {
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const s = base * slot.zoom;
    const pw = img.naturalWidth * s;
    const ph = img.naturalHeight * s;
    const cx = ox + w / 2 + slot.ox * w;
    // Face bias: when the photo is cropped vertically (wide/short panels),
    // anchor the visible window toward the top of the photo, where faces
    // live, instead of the dead centre — otherwise a portrait photo in a
    // 2.35:1 panel shows only chins and shoulders. The oy slider still
    // shifts around this anchor, clamped so the photo always covers.
    let cy = oy + h / 2 + slot.oy * h;
    if (ph > h) {
      cy = oy + ph * 0.3 + slot.oy * h;
      const lo = oy + h - ph / 2;
      const hi = oy + ph / 2;
      cy = Math.max(lo, Math.min(hi, cy));
    }
    ctx.filter = filterFor(treatment);
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(ox, oy, ox + w, oy + h);
    g.addColorStop(0, preset.bg[0]);
    g.addColorStop(1, preset.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(ox, oy, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.max(14, w * 0.045)}px "Bebas Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.max(2, w * 0.008)}px`; } catch { /* older canvas */ }
    ctx.fillText('YOUR PHOTO', ox + w / 2, oy + h / 2);
    ctx.restore();
  }
  treatmentOverlays(ctx, ox, oy, w, h, treatment, preset);
}

// ---------------------------------------------------------------------------
// The title block
// ---------------------------------------------------------------------------

/** Shrinks the display face until `text` fits `maxW`, returning its size. */
function fitTitleSize(ctx, text, maxW, startSize, family) {
  let size = startSize;
  ctx.font = `400 ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `400 ${size}px ${family}`;
  }
  return size;
}

/** The big condensed title: sunset gradient fill, dark outline, drop shadow, a lean. */
function drawDisplayTitle(ctx, text, cx, baselineY, maxW, startSize, preset) {
  const family = 'Anton, "Bebas Neue", sans-serif';
  const size = fitTitleSize(ctx, text, maxW, startSize, family);
  const grad = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.12);
  grad.addColorStop(0, preset.title[0]);
  grad.addColorStop(0.52, preset.title[1]);
  grad.addColorStop(1, preset.title[2]);
  ctx.save();
  ctx.translate(cx, baselineY);
  ctx.transform(1, 0, -0.05, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.strokeStyle = preset.outline;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.13;
  ctx.shadowOffsetY = size * 0.045;
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return size;
}

/** The subtitle: a neon script line, or letterspaced capitals on the dark grades. */
function drawSubtitle(ctx, text, cx, y, maxW, preset) {
  if (!text.trim()) return 0;
  let size;
  if (preset.subtitleScript) {
    size = fitTitleSize(ctx, text, maxW, Math.max(20, maxW * 0.055), 'Pacifico, cursive');
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(-0.03);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = preset.subtitle;
    ctx.shadowColor = preset.glow;
    ctx.shadowBlur = Math.max(10, size * 0.5);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    size = fitTitleSize(ctx, text, maxW, Math.max(18, maxW * 0.045), '"Bebas Neue", sans-serif');
    ctx.save();
    try { ctx.letterSpacing = `${Math.max(3, size * 0.22)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = preset.subtitle;
    ctx.fillText(text, cx, y);
    ctx.restore();
  }
  return size;
}

/** A small rotated badge in the corner of the title band. */
function drawBadge(ctx, text, x, y, preset, fontSize) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.06);
  ctx.font = `400 ${Math.round(fontSize)}px "Bebas Neue", sans-serif`;
  try { ctx.letterSpacing = '2px'; } catch { /* older canvas */ }
  const padX = fontSize * 0.8;
  const w = ctx.measureText(text).width + padX * 2;
  const h = fontSize * 1.6;
  ctx.fillStyle = preset.rule;
  ctx.shadowColor = preset.glow;
  ctx.shadowBlur = fontSize * 0.8;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

/** The title band (or the scrim the title sits on for a full-bleed cover). */
function drawTitleBlock(ctx, zone, state, preset, W, H) {
  const title = state.title.trim().toUpperCase() || 'VICE CITY';
  if (zone.mode === 'band') {
    const bandGrad = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
    bandGrad.addColorStop(0, preset.band);
    bandGrad.addColorStop(1, '#08060f');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.save();
    ctx.shadowColor = preset.glow;
    ctx.shadowBlur = Math.max(8, W * 0.01);
    ctx.fillStyle = preset.rule;
    ctx.fillRect(zone.x, zone.y, zone.w, Math.max(2, H * 0.003));
    ctx.restore();
    halftoneStrip(
      ctx,
      zone.x + zone.w * 0.64, zone.y + zone.h * 0.1,
      zone.w * 0.32, zone.h * 0.2,
      preset.accent, 0.5, Math.max(8, W * 0.008), Math.max(2, W * 0.0028),
    );
    const titleSize = drawDisplayTitle(
      ctx, title, zone.x + zone.w / 2,
      zone.y + zone.h * 0.56, zone.w * 0.9, zone.h * 0.52, preset,
    );
    drawSubtitle(
      ctx, state.subtitle,
      zone.x + zone.w / 2, zone.y + zone.h * 0.56 + titleSize * 0.42,
      zone.w * 0.6, preset,
    );
    ctx.save();
    ctx.font = `400 ${Math.max(12, zone.h * 0.11)}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, zone.h * 0.02)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = preset.credits;
    const credits = state.credits.trim() || 'A LEONIDA STORY';
    ctx.fillText(`★ ★ ★ ★ ☆   ${credits.toUpperCase()}`, zone.x + zone.w / 2, zone.y + zone.h * 0.92);
    ctx.restore();
    drawBadge(ctx, preset.badge, zone.x + Math.max(72, W * 0.085), zone.y + zone.h * 0.2, preset, Math.max(14, zone.h * 0.13));
  } else {
    const scrim = ctx.createLinearGradient(0, zone.y, 0, H);
    scrim.addColorStop(0, 'rgba(5,3,12,0)');
    scrim.addColorStop(0.45, 'rgba(5,3,12,0.55)');
    scrim.addColorStop(1, 'rgba(5,3,12,0.9)');
    ctx.fillStyle = scrim;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    drawSubtitle(ctx, state.subtitle, W / 2, H * 0.76, W * 0.6, preset);
    drawDisplayTitle(ctx, title, W / 2, H * 0.9, W * 0.92, H * 0.12, preset);
    ctx.save();
    ctx.font = `400 ${Math.max(12, H * 0.016)}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = '3px'; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = preset.credits;
    ctx.fillText(`★ ★ ★ ★ ☆   ${(state.credits.trim() || 'A LEONIDA STORY').toUpperCase()}`, W / 2, H * 0.965);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// The cover itself
// ---------------------------------------------------------------------------

/**
 * Paints the cover for `state` onto `canvas` (at the canvas's own size).
 * `photos` is an array of images (or null) aligned with state.slots.
 * `opts.selected` draws the editor's selection ring around one panel.
 */
export function drawCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const preset = PRESETS[state.preset] ?? PRESETS['vice-neon'];
  const geo = layoutPanels(state.layout, W, H);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, preset.bg[0]);
  bg.addColorStop(1, preset.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const count = LAYOUTS[state.layout]?.panels ?? 4;
  for (let i = 0; i < geo.panels.length; i++) {
    const slot = state.slots[i] ?? { src: null, zoom: 1.12, ox: 0, oy: 0, treatment: 'auto' };
    drawPhotoPanel(ctx, geo.panels[i], photos[i] ?? null, slot, preset, W);
  }
  void count;

  if (geo.seam) {
    ctx.save();
    ctx.strokeStyle = preset.rule;
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.shadowColor = preset.glow;
    ctx.shadowBlur = Math.max(10, W * 0.014);
    ctx.beginPath();
    ctx.moveTo(geo.seam[0][0], geo.seam[0][1]);
    ctx.lineTo(geo.seam[1][0], geo.seam[1][1]);
    ctx.stroke();
    ctx.restore();
  }

  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);
  drawTitleBlock(ctx, geo.title, state, preset, W, H);

  // The poster's hairline frame.
  ctx.save();
  ctx.strokeStyle = preset.accent;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(1.5, W * 0.0012);
  ctx.strokeRect(5, 5, W - 10, H - 10);
  ctx.restore();

  if (opts.selected >= 0 && geo.panels[opts.selected]) {
    const p = geo.panels[opts.selected];
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([14, 8]);
    ctx.lineWidth = Math.max(3, W * 0.003);
    ctx.shadowColor = preset.glow;
    ctx.shadowBlur = 16;
    if (p.rot) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.strokeRect(-p.w / 2 - 6, -p.h / 2 - 6, p.w + 12, p.h + 12);
    } else if (p.clip) {
      p.clip.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(p.x - 6, p.y - 6, p.w + 12, p.h + 12);
    }
    ctx.restore();
  }
}
