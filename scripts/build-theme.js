#!/usr/bin/env node
// Pre-compiles the Gruvbox theme into a static theme.css.
// Uses CSS custom properties scoped to body.dark / body.light so a single file
// covers both modes. No runtime JS or LESS compilation needed.

const fs   = require("fs");
const path = require("path");

// ── Official Gruvbox palette (morhetz/gruvbox) ────────────────────────────────

const DARK = {
  base:     "#282828", // dark0
  mantle:   "#1d2021", // dark0_hard  (secondary bg / sidebar backing)
  crust:    "#1d2021", // dark0_hard  (no darker official color exists)
  surface0: "#3c3836", // dark1
  surface1: "#504945", // dark2
  surface2: "#665c54", // dark3
  overlay0: "#7c6f64", // dark4
  overlay1: "#928374", // gray_245
  overlay2: "#bdae93", // light3
  subtext0: "#d5c4a1", // light2
  subtext1: "#ebdbb2", // light1
  text:     "#ebdbb2", // light1
  red:      "#fb4934", // bright_red
  orange:   "#fe8019", // bright_orange
  yellow:   "#fabd2f", // bright_yellow
  green:    "#b8bb26", // bright_green
  blue:     "#83a598", // bright_blue
  purple:   "#d3869b", // bright_purple
  aqua:     "#8ec07c", // bright_aqua
  accent:   "#fabd2f", // default accent = yellow
};

const LIGHT = {
  base:     "#fbf1c7", // light0
  mantle:   "#f2e5bc", // light0_soft
  crust:    "#ebdbb2", // light1
  surface0: "#d5c4a1", // light2
  surface1: "#bdae93", // light3
  surface2: "#a89984", // light4
  overlay0: "#928374", // gray_245
  overlay1: "#7c6f64", // dark4
  overlay2: "#665c54", // dark3
  subtext0: "#504945", // dark2
  subtext1: "#3c3836", // dark1
  text:     "#282828", // dark0
  red:      "#cc241d", // neutral_red
  orange:   "#d65d0e", // neutral_orange
  yellow:   "#d79921", // neutral_yellow
  green:    "#98971a", // neutral_green
  blue:     "#458588", // neutral_blue
  purple:   "#b16286", // neutral_purple
  aqua:     "#689d6a", // neutral_aqua
  accent:   "#d79921", // default accent = yellow
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexToHsl(hex) {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function darken(hex, pct) {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  l = Math.max(0, l - pct / 100);
  // hsl to rgb
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let nr, ng, nb;
  if (s === 0) { nr = ng = nb = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1/3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1/3);
  }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

// Build a :root body.dark / :root body.light CSS variable block
function cssVarBlock(bodyClass, palette) {
  const lines = [`body${bodyClass} {`];
  for (const [name, hex] of Object.entries(palette)) {
    const [r, g, b] = hexToRgb(hex);
    lines.push(`  --grv-${name}:     ${hex};`);
    lines.push(`  --grv-${name}-rgb: ${r}, ${g}, ${b};`);
    lines.push(`  --grv-${name}-hsl: ${hexToHsl(hex)};`);
  }
  // RemNote design tokens — map them to our vars so RemNote's own classes work
  const p = palette;
  lines.push(`\n  /* RemNote design tokens */`);
  lines.push(`  --rn-clr-background-primary:   ${p.base};`);
  lines.push(`  --rn-clr-background-secondary: ${p.mantle};`);
  lines.push(`  --rn-clr-background-tertiary:  ${p.crust};`);
  lines.push(`  --rn-clr-content-primary:      ${p.text};`);
  lines.push(`  --rn-clr-border-opaque:        ${p.surface1};`);
  lines.push(`  --rn-colors-gray-10:           ${p.surface0};`);
  lines.push(`  --rn-colors-gray-30:           ${p.surface1};`);
  lines.push(`  --rn-colors-gray-60:           ${p.overlay2};`);
  lines.push(`  --rn-colors-gray-80:           ${p.text};`);
  lines.push(`  --rn-colors-gray-90:           ${p.text};`);
  lines.push(`  --rn-colors-gray-100:          ${p.text};`);
  lines.push(`  --rn-clr-background-elevation-10: ${p.base};`);
  lines.push(`  --rn-clr-background-elevation-50: ${p.surface0};`);
  lines.push(`  --bg-mint-20:              ${p.aqua};`);
  lines.push(`  --bg-purple-20:            ${p.purple};`);
  lines.push(`  --bg-cyan-20:              ${p.blue};`);
  lines.push(`  --bg-yellow-20:            ${p.yellow};`);
  lines.push(`  --bg-orange-20:            ${p.orange};`);
  lines.push(`  --bg-red-20:               ${p.red};`);
  lines.push(`  --highlight-color-red:     ${p.red};`);
  lines.push(`  --highlight-color-orange:  ${p.orange};`);
  lines.push(`  --highlight-color-yellow:  ${p.yellow};`);
  lines.push(`  --highlight-color-blue:    ${p.blue};`);
  lines.push(`  --highlight-color-purple:  ${p.purple};`);
  lines.push(`  --highlight-color-green:   ${p.green};`);
  lines.push(`  --tw-bg-opacity: 0.7;`);
  lines.push(`  --tw-bg-opacity-highlight: var(--tw-bg-opacity);`);
  lines.push(`}`);
  return lines.join("\n");
}

// v(name) — shorthand to emit a var() reference
const v  = name => `var(--grv-${name})`;
const vr = name => `var(--grv-${name}-rgb)`;

// rgba helper using raw rgb var
const rgba = (name, alpha) => `rgba(${vr(name)}, ${alpha})`;

// ── Component styles (using CSS vars — work for both dark & light) ─────────────

function componentCSS(bodyClass, palette) {
  const accentDark = darken(palette.accent, 20);
  const checkboxAccent = palette.accent.replace("#", "%23");

  return `
/* ── Platform ─────────────────────────────────────────────────────────────── */
body${bodyClass} .rn-platform { background: ${v("base")} !important; color: ${v("text")} !important; }

/* ── Design token classes ────────────────────────────────────────────────── */
body${bodyClass} .rn-clr-background-primary         { background-color: ${v("base")}     !important; }
body${bodyClass} .rn-clr-background-secondary       { background-color: ${v("mantle")}   !important; }
body${bodyClass} .rn-clr-background-tertiary        { background-color: ${v("crust")}    !important; }
body${bodyClass} .rn-clr-background                 { background-color: ${v("base")}     !important; }
body${bodyClass} .rn-clr-background-light-accent    { background-color: ${v("surface1")} !important; }
body${bodyClass} .rn-clr-background-accent          { background-color: ${v("accent")}   !important; }
body${bodyClass} .rn-clr-background-accent--hovered { background-color: ${v("accent")}   !important; }
body${bodyClass} .rn-clr-background-elevation-5,
body${bodyClass} .rn-clr-background-elevation-10,
body${bodyClass} .rn-clr-background-elevation-15,
body${bodyClass} .rn-clr-background-elevation-20   { background: ${v("surface0")} !important; }
body${bodyClass} .rn-clr-background-elevation-30,
body${bodyClass} .rn-clr-background-elevation-40,
body${bodyClass} .rn-clr-background-elevation-50   { background: ${v("surface1")} !important; }
body${bodyClass} .rn-clr-content-primary            { color: ${v("text")}     !important; }
body${bodyClass} .rn-clr-content-secondary          { color: ${v("subtext1")} !important; }
body${bodyClass} .rn-clr-content-tertiary           { color: ${v("overlay2")} !important; }
body${bodyClass} .rn-clr-content-accent             { color: ${v("accent")}   !important; }
body${bodyClass} .rn-clr-content-state-disabled     { color: ${v("overlay1")} !important; }
body${bodyClass} .rn-clr-border-opaque              { border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-clr-border-selected            { border-color: ${v("accent")}   !important; }
body${bodyClass} .rn-clr-border-light-accent        { border-color: ${v("surface0")} !important; }
body${bodyClass} .rn-clr-border-accent              { border-color: ${v("accent")}   !important; }

/* ── Pane / editor ───────────────────────────────────────────────────────── */
body${bodyClass} .rn-pane__body          { background: ${v("base")} !important; }
body${bodyClass} .rn-pane__top-bar       { background: ${v("base")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
body${bodyClass} .rn-editor              { color: ${v("text")}; }
body${bodyClass} .rn-editor-container   { background: ${v("base")} !important; }
body${bodyClass} .rn-document           { color: ${v("text")}; }
body${bodyClass} .rn-document-wrapper   { background: ${v("base")} !important; }
body${bodyClass} .rn-sticky-header      { background: ${v("base")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
body${bodyClass} .top-bar-container     { background-color: ${v("base")} !important; }

/* ── Navigation bar ──────────────────────────────────────────────────────── */
body${bodyClass} .rn-navigation-bar { background: ${v("mantle")} !important; border-bottom: 1px solid ${v("surface1")} !important; }

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
body${bodyClass} .rn-sidebar          { background: ${v("crust")} !important; color: ${v("subtext1")} !important; border-right: 1px solid ${v("surface1")} !important; }
body${bodyClass} .rn-document-sidebar { background: ${v("crust")} !important; border-right: 1px solid ${v("surface1")} !important; }
body${bodyClass} #document-sidebar    { background-color: ${v("crust")} !important; }
body${bodyClass} .rn-sidebar-counter  { color: ${v("overlay2")} !important; }
body${bodyClass} .mosaic-tile         { border-color: ${v("surface1")}; }

/* ── Document header ─────────────────────────────────────────────────────── */
body${bodyClass} .rn-doc-header { background: ${v("base")} !important; color: ${v("text")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
body${bodyClass} .rn-doc-title  { color: ${v("text")} !important; }

/* ── Omnibar / Search ────────────────────────────────────────────────────── */
body${bodyClass} div[data-cy="omnibar"]          { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} div[data-omnibar-results="true"] { background: ${v("surface0")} !important; }
body${bodyClass} .rn-omnibar                     { background: ${v("surface0")} !important; }
body${bodyClass} .rn-search                      { background: ${v("surface0")} !important; }
body${bodyClass} #search-results__result         { color: ${v("text")}; margin-top: 4px; margin-bottom: 4px; }
body${bodyClass} #search-results__result[data-cmdopt-selected="true"] { background-color: ${rgba("accent", 0.4)}; }
body${bodyClass} #search-results__result.rn-clr-background--hovered  { background: ${rgba("text", 0.05)} !important; }
body${bodyClass} #search-results__no-results     { background: ${v("surface0")} !important; color: ${v("overlay2")} !important; }
body${bodyClass} .rich-text-editor__search-results div[data-search-result="search-result-panel"] { background: ${v("surface0")} !important; }
body${bodyClass} .rn-ctrl-f  { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Floating toolbar ────────────────────────────────────────────────────── */
body${bodyClass} .rn-floating-toolbar         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-floating-toolbar-wrapper { border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-background-toolbar       { background-color: ${v("surface0")} !important; }

/* ── Popups / Menus / Dialogs ────────────────────────────────────────────── */
body${bodyClass} .rn-popup.popup-menu > .rn-popup__content { background: ${v("surface0")} !important; }
body${bodyClass} .rn-popup            { background: ${v("surface0")} !important; }
body${bodyClass} .rn-popup-background { background: ${v("surface0")} !important; }
body${bodyClass} .rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden { background-color: ${v("surface0")} !important; }
body${bodyClass} .rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden.overflow-x-hidden { background-color: ${v("base")} !important; }
body${bodyClass} .rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden.overflow-x-hidden #search-results__list { background-color: ${v("surface0")} !important; }
body${bodyClass} .rn-menu              { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-clr-shadow-menu   { background: ${v("surface0")} !important; }
body${bodyClass} .rn-clr-shadow-default,
body${bodyClass} .rn-clr-shadow-card,
body${bodyClass} .rn-clr-shadow-menu,
body${bodyClass} .rn-clr-shadow-modal  { box-shadow: 0 2px 8px ${rgba("crust", 0.4)} !important; }
body${bodyClass} .remnote-tooltip-container { background: ${v("surface1")} !important; color: ${v("text")} !important; }
body${bodyClass} .pricing-feature-tooltip  { background: ${v("surface1")} !important; color: ${v("text")} !important; }
body${bodyClass} .table-background-overlay { background: ${v("base")} !important; }
body${bodyClass} .rn-dialog            { background: ${v("surface0")} !important; }
body${bodyClass} .rn-dialog-background { background: ${rgba("crust", 0.5)} !important; }
body${bodyClass} .rn-sort-popup        { background: ${v("surface0")} !important; }
body${bodyClass} .rn-paste-popup       { background: ${v("surface0")} !important; }
body${bodyClass} div[data-cy="selected-text-menu"]      { background: ${v("surface0")} !important; }
body${bodyClass} div[data-cy="tag-configure-options"] > div { background: ${v("surface0")} !important; }
body${bodyClass} .rn-document-preview  { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Tags / Portals / References ─────────────────────────────────────────── */
body${bodyClass} .rn-tag           { color: ${v("subtext1")} !important; }
body${bodyClass} .rn-rem-reference { color: ${v("accent")} !important; }
body${bodyClass} .rn-search-portal { border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-work-in-progress-rem     { background: ${v("surface0")} !important; color: ${v("text")} !important; }
body${bodyClass} .rn-work-in-progress-portal  { border-color: ${v("surface1")} !important; }

/* ── Bullets / List ──────────────────────────────────────────────────────── */
body${bodyClass} .rn-rem-bullet      { color: ${v("overlay1")} !important; }
body${bodyClass} .rn-bullet-container { color: ${v("overlay1")} !important; }
body${bodyClass} .rn-list-number     { color: ${v("overlay2")} !important; }

/* ── Code blocks ─────────────────────────────────────────────────────────── */
body${bodyClass} .rn-code-node { background: ${v("surface0")} !important; color: ${v("text")} !important; border-color: ${v("surface1")} !important; }

/* ── Headings ────────────────────────────────────────────────────────────── */
body${bodyClass} .rn-text-heading-large,
body${bodyClass} .rn-text-heading-medium,
body${bodyClass} .rn-text-heading-small,
body${bodyClass} .rn-text-heading-xsmall { color: ${v("text")} !important; }

/* ── Quote ───────────────────────────────────────────────────────────────── */
body${bodyClass} .rn-quote         { border-color: ${v("accent")} !important; }
body${bodyClass} .rn-quote-inner   { color: ${v("subtext1")} !important; }
body${bodyClass} .rn-quote-content { color: ${v("subtext1")} !important; }

/* ── Cards / Dividers / Progress ─────────────────────────────────────────── */
body${bodyClass} .rn-card3         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-divider       { background: ${v("surface1")} !important; --rn-colors-gray-20: ${v("surface1")}; }
body${bodyClass} .rn-editor-divider { background: ${v("surface1")} !important; }
body${bodyClass} .rn-progress-bar  { background: ${v("surface0")} !important; }

/* ── Buttons / Switches ──────────────────────────────────────────────────── */
body${bodyClass} .rn-button        { color: ${v("text")} !important; background-color: ${v("mantle")} !important; border-color: ${v("surface1")} !important; transition: background-color 0.1s ease-in-out; }
body${bodyClass} .rn-button:hover  { background-color: ${v("surface0")} !important; }
body${bodyClass} .rn-button--primary,
body${bodyClass} .rn-button.rn-button--primary        { color: ${v("crust")} !important; background-color: ${v("accent")} !important; border-color: ${v("accent")} !important; }
body${bodyClass} .rn-button--primary:hover,
body${bodyClass} .rn-button.rn-button--primary:hover  { color: ${v("crust")} !important; background-color: ${accentDark} !important; }
body${bodyClass} .rn-checkbox      { border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-switch        { background: ${v("crust")} !important; box-sizing: content-box; }
body${bodyClass} .rn-switch[data-state="checked"] { background-color: ${v("crust")} !important; border-color: ${v("accent")} !important; border-width: 2.1px !important; border-style: solid !important; }
body${bodyClass} .rn-switch-handle { background: ${v("surface0")} !important; }
body${bodyClass} .rn-settings__link:hover { background-color: ${v("mantle")} !important; border-radius: 4px; }
body${bodyClass} .rn-settings__link.rn-clr-content-accent { color: ${v("accent")}; }

/* ── Checkboxes ──────────────────────────────────────────────────────────── */
body${bodyClass} .rn-checkbox--checked   { background-color: ${v("surface0")} !important; color: ${v("accent")} !important; border-color: ${v("accent")} !important; background-image: url("data:image/svg+xml,%3Csvg width='22' height='14' viewBox='-2 0 20 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m6.5 12.6-6.1-6 2.2-2.2 3.9 4L13.9.9l2.2 2.2-9.6 9.5Z' fill='${checkboxAccent}' /%3E%3C/svg%3E") !important; }
body${bodyClass} .rn-checkbox--unchecked { color: ${v("accent")} !important; background-color: ${v("surface0")} !important; border-color: ${v("overlay0")} !important; }

/* ── Settings / All Notes ────────────────────────────────────────────────── */
body${bodyClass} .rn-settings  { background: ${v("base")} !important; }
body${bodyClass} .rn-all-notes { background: ${v("base")} !important; }

/* ── Folder / document list view ─────────────────────────────────────────── */
body${bodyClass} .rn-folder-page           { background: ${v("base")} !important; }
body${bodyClass} .rn-document-card         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-document-card__title  { color: ${v("text")} !important; }
body${bodyClass} .rn-document-card__body   { color: ${v("subtext1")} !important; }
body${bodyClass} .rn-mosaic-card           { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-mosaic-card__title    { color: ${v("text")} !important; }
body${bodyClass} .rn-tree-node__label      { color: ${v("text")} !important; }
body${bodyClass} .rn-tree-node             { color: ${v("text")}; }
body${bodyClass} .rn-editor__rem__body__text { color: ${v("text")} !important; }
body${bodyClass} .rn-rem-text              { color: ${v("text")}; }
body${bodyClass} .rn-document             { color: ${v("text")}; }
body${bodyClass} .rn-editor               { color: ${v("text")}; }

/* ── Queue / Review ──────────────────────────────────────────────────────── */
body${bodyClass} .rn-queue-container   { background: ${v("mantle")} !important; }
body${bodyClass} .rn-queue             { background: ${v("base")} !important; }
body${bodyClass} .rn-queue-rem         { color: ${v("text")} !important; }
body${bodyClass} .rn-flashcard-delimiter { color: ${v("overlay1")} !important; }
body${bodyClass} .rn-flashcards-edit,
body${bodyClass} .rn-flashcards-home,
body${bodyClass} .rn-flashcards-page-container { background: ${v("base")} !important; }

/* ── Deck list / Study ───────────────────────────────────────────────────── */
body${bodyClass} .rn-deck-list     { background: ${v("base")} !important; }
body${bodyClass} .rn-study-deck-btn { background: ${v("surface0")} !important; color: ${v("text")} !important; }

/* ── PDF viewer ──────────────────────────────────────────────────────────── */
body${bodyClass} .rn-pdf-viewer { background: ${v("base")} !important; }

/* ── Tables ──────────────────────────────────────────────────────────────── */
body${bodyClass} .rn-table-header  { background: ${v("surface0")} !important; color: ${v("subtext1")} !important; }
body${bodyClass} .rn-table-row     { background: ${v("base")} !important; }
body${bodyClass} .rn-column-header { background: ${v("surface0")} !important; }

/* ── Toast / Notifications ───────────────────────────────────────────────── */
body${bodyClass} .rn-toast            { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
body${bodyClass} .rn-toast-container  { background: ${v("surface0")} !important; }
body${bodyClass} .rn-notification-banner { background: ${v("mantle")} !important; color: ${v("text")} !important; }

/* ── Plugin sidebar ──────────────────────────────────────────────────────── */
body${bodyClass} .rn-plugin-sidebar { background: ${v("mantle")} !important; }
body${bodyClass} .rn-plugin         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Cloze ───────────────────────────────────────────────────────────────── */
body${bodyClass} .cloze        { background-color: ${rgba("surface2", 0.3)}; border-bottom-color: ${v("accent")}; }
body${bodyClass} .cloze:hover  { border-bottom-color: ${accentDark}; }
body${bodyClass} .rn-fill-in-blank { border-color: ${v("accent")} !important; }
body${bodyClass} .rn-cloze-button  { color: ${v("accent")} !important; }

/* ── Highlight colors ────────────────────────────────────────────────────── */
body${bodyClass} .highlight-color--red    { background-color: ${rgba("red",    0.7)}; color: ${v("text")}; }
body${bodyClass} .highlight-color--orange { background-color: ${rgba("orange", 0.7)}; color: ${v("text")}; }
body${bodyClass} .highlight-color--yellow { background-color: ${rgba("yellow", 0.7)}; color: ${v("text")}; }
body${bodyClass} .highlight-color--blue   { background-color: ${rgba("blue",   0.7)}; color: ${v("text")}; }
body${bodyClass} .highlight-color--purple { background-color: ${rgba("purple", 0.7)}; color: ${v("text")}; }
body${bodyClass} .highlight-color--green  { background-color: ${rgba("green",  0.7)}; color: ${v("text")}; }
body${bodyClass} .rn-highlight-reference  { background: ${rgba("yellow", 0.15)} !important; }
body${bodyClass} .rn-html-viewer   { background: ${v("base")} !important; }
body${bodyClass} .rn-html-highlight { background: ${rgba("yellow", 0.2)} !important; }

/* ── Links ───────────────────────────────────────────────────────────────── */
body${bodyClass} a        { color: ${v("accent")}; }
body${bodyClass} a:hover  { color: ${v("subtext1")}; }
body${bodyClass} .text-blue-60     { color: ${v("accent")} !important; }
body${bodyClass} .rn-rem-reference { color: ${v("accent")}; }

/* ── Tab active indicator ────────────────────────────────────────────────── */
body${bodyClass} [data-cy-active="true"] { border-bottom-color: ${v("accent")} !important; }

/* ── Hover / selection ───────────────────────────────────────────────────── */
body${bodyClass} .rn-clr-background--hovered              { background: ${rgba("text", 0.05)} !important; }
body${bodyClass} .hover\\:rn-clr-background--hovered:hover { background: ${v("mantle")} !important; }
body${bodyClass} .hover\\:rn-clr-background-accent--hovered:hover { background: ${accentDark} !important; }
body${bodyClass} .hover\\:rn-clr-background-light-accent--hovered { background: ${rgba("accent", 1)} !important; color: ${v("mantle")} !important; }

/* ── Learning state icons ────────────────────────────────────────────────── */
body${bodyClass} svg[data-icon="learning-state-active"] path      { fill:   ${v("green")}; }
body${bodyClass} svg[data-icon="learning-state-paused"] path      { stroke: ${v("overlay0")}; }
body${bodyClass} svg[data-icon="learning-state-maintaining"] path { stroke: ${v("yellow")}; }
body${bodyClass} svg[data-icon="learning-state-maintaining"] circle { fill: ${v("yellow")}; }
body${bodyClass} svg[data-icon="learning-state-no-priority"] path { stroke: ${v("overlay2")}; }

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
body${bodyClass} ::-webkit-scrollbar       { width: 8px; height: 8px; }
body${bodyClass} ::-webkit-scrollbar-track { background: transparent; }
body${bodyClass} ::-webkit-scrollbar-thumb { background: ${v("overlay1")}; border-radius: 4px; }
body${bodyClass} ::-webkit-scrollbar-thumb:hover { background: ${v("overlay2")}; }
`.trim();
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const darkVars  = cssVarBlock(".dark",  DARK);
  const lightVars = cssVarBlock(".light", LIGHT);
  const darkCSS   = componentCSS(".dark",  DARK);
  const lightCSS  = componentCSS(".light", LIGHT);

  // Selection highlight — uses ::selection which can't be nested in a body selector
  const selectionCSS = `
/* ── Selection ───────────────────────────────────────────────────────────── */
body.dark  ::selection { background: rgba(${hexToRgb(DARK.accent).join(", ")},  0.35) !important; }
body.light ::selection { background: rgba(${hexToRgb(LIGHT.accent).join(", ")}, 0.35) !important; }
`.trim();

  const output = [
    `/* Gruvbox theme for RemNote`,
    ` * Source: https://github.com/security-log/remnote-gruvbox`,
    ` * Palette: https://github.com/morhetz/gruvbox`,
    ` */`,
    "",
    darkVars,
    "",
    lightVars,
    "",
    darkCSS,
    "",
    lightCSS,
    "",
    selectionCSS,
    "",
  ].join("\n");

  const outPath = path.join(__dirname, "../public/theme.css");
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`Written ${outPath} (${(output.length / 1024).toFixed(1)} KB)`);
}

main();
