#!/usr/bin/env node
// Pre-compiles the Gruvbox theme into a static theme.css.
//
// Architecture:
//   body.dark  { --grv-*: <dark values>;  }   ← CSS vars, scoped per mode
//   body.light { --grv-*: <light values>; }
//   .rn-sidebar { background: var(--grv-crust) !important; }  ← unscoped, always apply
//
// Unscoped rules + CSS vars is the same pattern Dracula uses (hardcoded
// values) but with the flexibility of dark/light support.

const fs   = require("fs");
const path = require("path");

// ── Official Gruvbox palette (morhetz/gruvbox) ────────────────────────────────

const DARK = {
  base:     "#282828", mantle:   "#1d2021", crust:    "#1d2021",
  surface0: "#3c3836", surface1: "#504945", surface2: "#665c54",
  overlay0: "#7c6f64", overlay1: "#928374", overlay2: "#bdae93",
  subtext0: "#d5c4a1", subtext1: "#ebdbb2", text:     "#ebdbb2",
  red:      "#fb4934", orange:   "#fe8019", yellow:   "#fabd2f",
  green:    "#b8bb26", blue:     "#83a598", purple:   "#d3869b", aqua: "#8ec07c",
  accent:   "#fabd2f",
};

const LIGHT = {
  base:     "#fbf1c7", mantle:   "#f2e5bc", crust:    "#ebdbb2",
  surface0: "#d5c4a1", surface1: "#bdae93", surface2: "#a89984",
  overlay0: "#928374", overlay1: "#7c6f64", overlay2: "#665c54",
  subtext0: "#504945", subtext1: "#3c3836", text:     "#282828",
  red:      "#cc241d", orange:   "#d65d0e", yellow:   "#d79921",
  green:    "#98971a", blue:     "#458588", purple:   "#b16286", aqua: "#689d6a",
  accent:   "#d79921",
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
    const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p2 = 2 * l - q2;
    nr = hue2rgb(p2, q2, h + 1/3);
    ng = hue2rgb(p2, q2, h);
    nb = hue2rgb(p2, q2, h - 1/3);
  }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

// ── CSS variable block (scoped to body.dark / body.light) ─────────────────────

function cssVarBlock(bodyClass, palette) {
  const accentDark = darken(palette.accent, 20);
  const lines = [
    `body${bodyClass} {`,
    `  color:      ${palette.text};`,
    `  background: ${palette.base};`,
  ];
  for (const [name, hex] of Object.entries(palette)) {
    const [r, g, b] = hexToRgb(hex);
    lines.push(`  --grv-${name}:     ${hex};`);
    lines.push(`  --grv-${name}-rgb: ${r}, ${g}, ${b};`);
    lines.push(`  --grv-${name}-hsl: ${hexToHsl(hex)};`);
  }
  lines.push(`  --grv-accent-dark: ${accentDark};`);

  // RemNote design tokens
  const p = palette;
  lines.push(`\n  /* RemNote design tokens */`);
  lines.push(`  --rn-clr-background-primary:      ${p.base};`);
  lines.push(`  --rn-clr-background-secondary:    ${p.mantle};`);
  lines.push(`  --rn-clr-background-tertiary:     ${p.crust};`);
  lines.push(`  --rn-clr-content-primary:         ${p.text};`);
  lines.push(`  --rn-clr-border-opaque:           ${p.surface1};`);
  lines.push(`  --rn-colors-gray-10:              ${p.surface0};`);
  lines.push(`  --rn-colors-gray-30:              ${p.surface1};`);
  lines.push(`  --rn-colors-gray-60:              ${p.overlay2};`);
  lines.push(`  --rn-colors-gray-80:              ${p.text};`);
  lines.push(`  --rn-colors-gray-90:              ${p.text};`);
  lines.push(`  --rn-colors-gray-100:             ${p.text};`);
  lines.push(`  --rn-clr-background-elevation-10: ${p.base};`);
  lines.push(`  --rn-clr-background-elevation-50: ${p.surface0};`);
  lines.push(`  --bg-mint-20:             ${p.aqua};`);
  lines.push(`  --bg-purple-20:           ${p.purple};`);
  lines.push(`  --bg-cyan-20:             ${p.blue};`);
  lines.push(`  --bg-yellow-20:           ${p.yellow};`);
  lines.push(`  --bg-orange-20:           ${p.orange};`);
  lines.push(`  --bg-red-20:              ${p.red};`);
  lines.push(`  --highlight-color-red:    ${p.red};`);
  lines.push(`  --highlight-color-orange: ${p.orange};`);
  lines.push(`  --highlight-color-yellow: ${p.yellow};`);
  lines.push(`  --highlight-color-blue:   ${p.blue};`);
  lines.push(`  --highlight-color-purple: ${p.purple};`);
  lines.push(`  --highlight-color-green:  ${p.green};`);
  lines.push(`  --tw-bg-opacity: 0.7;`);
  lines.push(`  --tw-bg-opacity-highlight: var(--tw-bg-opacity);`);
  lines.push(`}`);
  return lines.join("\n");
}

// ── Unscoped component rules (var() resolves per body class) ──────────────────

const v    = name => `var(--grv-${name})`;
const vr   = name => `var(--grv-${name}-rgb)`;
const rgba = (name, alpha) => `rgba(${vr(name)}, ${alpha})`;

function componentCSS() {
  return `
/* ── Platform ─────────────────────────────────────────────────────────────── */
.rn-platform { background: ${v("base")} !important; color: ${v("text")} !important; }

/* ── Design token classes ────────────────────────────────────────────────── */
.rn-clr-background-primary         { background-color: ${v("base")}     !important; }
.rn-clr-background-secondary       { background-color: ${v("mantle")}   !important; }
.rn-clr-background-tertiary        { background-color: ${v("crust")}    !important; }
.rn-clr-background                 { background-color: ${v("base")}     !important; }
.rn-clr-background-light-accent    { background-color: ${v("surface1")} !important; }
.rn-clr-background-accent          { background-color: ${v("accent")}   !important; }
.rn-clr-background-accent--hovered { background-color: ${v("accent")}   !important; }
.rn-clr-background-elevation-5,
.rn-clr-background-elevation-10,
.rn-clr-background-elevation-15,
.rn-clr-background-elevation-20    { background: ${v("surface0")} !important; }
.rn-clr-background-elevation-30,
.rn-clr-background-elevation-40,
.rn-clr-background-elevation-50    { background: ${v("surface1")} !important; }
.rn-clr-content-primary            { color: ${v("text")}     !important; }
.rn-clr-content-secondary          { color: ${v("subtext1")} !important; }
.rn-clr-content-tertiary           { color: ${v("overlay2")} !important; }
.rn-clr-content-on-color           { color: ${v("text")}     !important; }
.rn-clr-content-accent             { color: ${v("accent")}   !important; }
.rn-clr-content-state-disabled     { color: ${v("overlay1")} !important; }
.rn-clr-border-opaque              { border-color: ${v("surface1")} !important; }
.rn-clr-border-selected            { border-color: ${v("accent")}   !important; }
.rn-clr-border-light-accent        { border-color: ${v("surface0")} !important; }
.rn-clr-border-accent              { border-color: ${v("accent")}   !important; }

/* ── Pane / editor ───────────────────────────────────────────────────────── */
.rn-pane__body        { background: ${v("base")} !important; }
.rn-pane__top-bar     { background: ${v("base")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
.rn-editor            { color: ${v("text")} !important; }
.rn-editor-container  { background: ${v("base")} !important; }
.rn-document          { color: ${v("text")} !important; }
.rn-document-wrapper  { background: ${v("base")} !important; }
.rn-sticky-header     { background: ${v("base")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
.top-bar-container    { background-color: ${v("base")} !important; }
.rn-editor__rem__body__text { color: ${v("text")} !important; }

/* ── Navigation bar ──────────────────────────────────────────────────────── */
.rn-navigation-bar { background: ${v("mantle")} !important; border-bottom: 1px solid ${v("surface1")} !important; }

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.rn-sidebar           { background: ${v("crust")} !important; color: ${v("subtext1")} !important; border-right: 1px solid ${v("surface1")} !important; }
.rn-document-sidebar  { background: ${v("crust")} !important; border-right: 1px solid ${v("surface1")} !important; }
#document-sidebar     { background-color: ${v("crust")} !important; }
.rn-sidebar-counter   { color: ${v("overlay2")} !important; }
.mosaic-tile          { border-color: ${v("surface1")}; }

/* ── Document header ─────────────────────────────────────────────────────── */
.rn-doc-header { background: ${v("base")} !important; color: ${v("text")} !important; border-bottom: 1px solid ${v("surface1")} !important; }
.rn-doc-title  { color: ${v("text")} !important; }

/* ── All Notes / folder view ─────────────────────────────────────────────── */
.rn-all-notes          { background: ${v("base")} !important; color: ${v("text")} !important; }
.rn-folder-page        { background: ${v("base")} !important; }
.rn-document-card      { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-document-card__title { color: ${v("text")} !important; }
.rn-document-card__body  { color: ${v("subtext1")} !important; }
.rn-mosaic-card        { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-mosaic-card__title { color: ${v("text")} !important; }
.rn-tree-node          { color: ${v("text")}; }
.rn-tree-node__label   { color: ${v("text")} !important; }
.rn-rem-text           { color: ${v("text")}; }

/* ── Omnibar / Search ────────────────────────────────────────────────────── */
div[data-cy="omnibar"]           { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
div[data-omnibar-results="true"] { background: ${v("surface0")} !important; }
.rn-omnibar   { background: ${v("surface0")} !important; }
.rn-search    { background: ${v("surface0")} !important; }
#search-results__result { color: ${v("text")}; margin-top: 4px; margin-bottom: 4px; }
#search-results__result[data-cmdopt-selected="true"] { background-color: ${rgba("accent", 0.4)}; }
#search-results__result.rn-clr-background--hovered   { background: ${rgba("text", 0.05)} !important; }
#search-results__no-results { background: ${v("surface0")} !important; color: ${v("overlay2")} !important; }
.rich-text-editor__search-results div[data-search-result="search-result-panel"] { background: ${v("surface0")} !important; }
.rn-ctrl-f { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Floating toolbar ────────────────────────────────────────────────────── */
.rn-floating-toolbar          { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-floating-toolbar-wrapper  { border-color: ${v("surface1")} !important; }
.rn-background-toolbar        { background-color: ${v("surface0")} !important; }

/* ── Popups / Menus / Dialogs ────────────────────────────────────────────── */
.rn-popup.popup-menu > .rn-popup__content { background: ${v("surface0")} !important; }
.rn-popup            { background: ${v("surface0")} !important; }
.rn-popup-background { background: ${v("surface0")} !important; }
.rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden { background-color: ${v("surface0")} !important; }
.rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden.overflow-x-hidden { background-color: ${v("base")} !important; }
.rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden.overflow-x-hidden #search-results__list { background-color: ${v("surface0")} !important; }
.rn-menu               { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-clr-shadow-menu    { background: ${v("surface0")} !important; }
.rn-clr-shadow-default,
.rn-clr-shadow-card,
.rn-clr-shadow-menu,
.rn-clr-shadow-modal   { box-shadow: 0 2px 8px ${rgba("crust", 0.4)} !important; }
.remnote-tooltip-container  { background: ${v("surface1")} !important; color: ${v("text")} !important; }
.pricing-feature-tooltip    { background: ${v("surface1")} !important; color: ${v("text")} !important; }
.table-background-overlay   { background: ${v("base")} !important; }
.rn-dialog            { background: ${v("surface0")} !important; }
.rn-dialog-background { background: ${rgba("crust", 0.5)} !important; }
.rn-sort-popup        { background: ${v("surface0")} !important; }
.rn-paste-popup       { background: ${v("surface0")} !important; }
div[data-cy="selected-text-menu"]        { background: ${v("surface0")} !important; }
div[data-cy="tag-configure-options"] > div { background: ${v("surface0")} !important; }
.rn-document-preview  { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Tags / Portals / References ─────────────────────────────────────────── */
.rn-tag            { color: ${v("subtext1")} !important; }
.rn-rem-reference  { color: ${v("accent")} !important; }
.rn-search-portal  { border-color: ${v("surface1")} !important; }
.rn-work-in-progress-rem   { background: ${v("surface0")} !important; color: ${v("text")} !important; }
.rn-work-in-progress-portal { border-color: ${v("surface1")} !important; }

/* ── Bullets / List ──────────────────────────────────────────────────────── */
.rn-rem-bullet       { color: ${v("overlay1")} !important; }
.rn-bullet-container { color: ${v("overlay1")} !important; }
.rn-list-number      { color: ${v("overlay2")} !important; }

/* ── Code blocks ─────────────────────────────────────────────────────────── */
.rn-code-node { background: ${v("surface0")} !important; color: ${v("text")} !important; border-color: ${v("surface1")} !important; }

/* ── Headings ────────────────────────────────────────────────────────────── */
.rn-text-heading-large,
.rn-text-heading-medium,
.rn-text-heading-small,
.rn-text-heading-xsmall { color: ${v("text")} !important; }

/* ── Quote ───────────────────────────────────────────────────────────────── */
.rn-quote         { border-color: ${v("accent")} !important; }
.rn-quote-inner   { color: ${v("subtext1")} !important; }
.rn-quote-content { color: ${v("subtext1")} !important; }

/* ── Cards / Dividers / Progress ─────────────────────────────────────────── */
.rn-card3         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-divider       { background: ${v("surface1")} !important; --rn-colors-gray-20: ${v("surface1")}; }
.rn-editor-divider { background: ${v("surface1")} !important; }
.rn-progress-bar  { background: ${v("surface0")} !important; }

/* ── Buttons / Switches ──────────────────────────────────────────────────── */
.rn-button        { color: ${v("text")} !important; background-color: ${v("mantle")} !important; border-color: ${v("surface1")} !important; transition: background-color 0.1s ease-in-out; }
.rn-button:hover  { background-color: ${v("surface0")} !important; }
.rn-button--primary,
.rn-button.rn-button--primary       { color: ${v("crust")} !important; background-color: ${v("accent")} !important; border-color: ${v("accent")} !important; }
.rn-button--primary:hover,
.rn-button.rn-button--primary:hover { color: ${v("crust")} !important; background-color: var(--grv-accent-dark) !important; }
.rn-checkbox      { border-color: ${v("surface1")} !important; }
.rn-switch        { background: ${v("crust")} !important; box-sizing: content-box; }
.rn-switch[data-state="checked"] { background-color: ${v("crust")} !important; border-color: ${v("accent")} !important; border-width: 2.1px !important; border-style: solid !important; }
.rn-switch-handle { background: ${v("surface0")} !important; }
.rn-settings__link:hover { background-color: ${v("mantle")} !important; border-radius: 4px; }
.rn-settings__link.rn-clr-content-accent { color: ${v("accent")}; }

/* ── Checkboxes (data-uri can't use CSS vars — kept scoped) ──────────────── */
.rn-checkbox--unchecked { color: ${v("accent")} !important; background-color: ${v("surface0")} !important; border-color: ${v("overlay0")} !important; }

/* ── Settings ────────────────────────────────────────────────────────────── */
.rn-settings { background: ${v("base")} !important; }

/* ── Queue / Review ──────────────────────────────────────────────────────── */
.rn-queue-container  { background: ${v("mantle")} !important; }
.rn-queue            { background: ${v("base")} !important; }
.rn-queue-rem        { color: ${v("text")} !important; }
.rn-flashcard-delimiter { color: ${v("overlay1")} !important; }
.rn-flashcards-edit,
.rn-flashcards-home,
.rn-flashcards-page-container { background: ${v("base")} !important; }

/* ── Deck list / Study ───────────────────────────────────────────────────── */
.rn-deck-list      { background: ${v("base")} !important; }
.rn-study-deck-btn { background: ${v("surface0")} !important; color: ${v("text")} !important; }

/* ── PDF viewer ──────────────────────────────────────────────────────────── */
.rn-pdf-viewer { background: ${v("base")} !important; }

/* ── Tables ──────────────────────────────────────────────────────────────── */
.rn-table-header   { background: ${v("surface0")} !important; color: ${v("subtext1")} !important; }
.rn-table-row      { background: ${v("base")} !important; }
.rn-column-header  { background: ${v("surface0")} !important; }

/* ── Toast / Notifications ───────────────────────────────────────────────── */
.rn-toast            { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }
.rn-toast-container  { background: ${v("surface0")} !important; }
.rn-notification-banner { background: ${v("mantle")} !important; color: ${v("text")} !important; }

/* ── Plugin sidebar ──────────────────────────────────────────────────────── */
.rn-plugin-sidebar { background: ${v("mantle")} !important; }
.rn-plugin         { background: ${v("surface0")} !important; border-color: ${v("surface1")} !important; }

/* ── Cloze ───────────────────────────────────────────────────────────────── */
.cloze       { background-color: ${rgba("surface2", 0.3)}; border-bottom-color: ${v("accent")}; }
.cloze:hover { border-bottom-color: var(--grv-accent-dark); }
.rn-fill-in-blank { border-color: ${v("accent")} !important; }
.rn-cloze-button  { color: ${v("accent")} !important; }

/* ── Highlight colors ────────────────────────────────────────────────────── */
.highlight-color--red    { background-color: ${rgba("red",    0.7)}; color: ${v("text")}; }
.highlight-color--orange { background-color: ${rgba("orange", 0.7)}; color: ${v("text")}; }
.highlight-color--yellow { background-color: ${rgba("yellow", 0.7)}; color: ${v("text")}; }
.highlight-color--blue   { background-color: ${rgba("blue",   0.7)}; color: ${v("text")}; }
.highlight-color--purple { background-color: ${rgba("purple", 0.7)}; color: ${v("text")}; }
.highlight-color--green  { background-color: ${rgba("green",  0.7)}; color: ${v("text")}; }
.rn-highlight-reference  { background: ${rgba("yellow", 0.15)} !important; }
.rn-html-viewer          { background: ${v("base")} !important; }
.rn-html-highlight       { background: ${rgba("yellow", 0.2)} !important; }

/* ── Links ───────────────────────────────────────────────────────────────── */
a       { color: ${v("accent")}; }
a:hover { color: ${v("subtext1")}; }
.text-blue-60     { color: ${v("accent")} !important; }
.rn-rem-reference { color: ${v("accent")}; }

/* ── Tab active indicator ────────────────────────────────────────────────── */
[data-cy-active="true"] { border-bottom-color: ${v("accent")} !important; }

/* ── Hover / selection ───────────────────────────────────────────────────── */
.rn-clr-background--hovered               { background: ${rgba("text", 0.05)} !important; }
.hover\\:rn-clr-background--hovered:hover  { background: ${v("mantle")} !important; }
.hover\\:rn-clr-background-accent--hovered:hover { background: var(--grv-accent-dark) !important; }
.hover\\:rn-clr-background-light-accent--hovered { background: ${rgba("accent", 1)} !important; color: ${v("mantle")} !important; }

/* ── Learning state icons ────────────────────────────────────────────────── */
svg[data-icon="learning-state-active"] path       { fill:   ${v("green")}; }
svg[data-icon="learning-state-paused"] path       { stroke: ${v("overlay0")}; }
svg[data-icon="learning-state-maintaining"] path  { stroke: ${v("yellow")}; }
svg[data-icon="learning-state-maintaining"] circle { fill:  ${v("yellow")}; }
svg[data-icon="learning-state-no-priority"] path  { stroke: ${v("overlay2")}; }

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
::-webkit-scrollbar       { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${v("overlay1")}; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: ${v("overlay2")}; }

/* ── Selection ───────────────────────────────────────────────────────────── */
::selection { background: ${rgba("accent", 0.35)} !important; }
`.trim();
}

// ── Checkbox SVG (can't use CSS vars in url()) — kept scoped ─────────────────

function checkboxCSS(palette, bodyClass) {
  const hex = palette.accent.replace("#", "%23");
  return `body${bodyClass} .rn-checkbox--checked { background-color: ${palette.surface0} !important; color: ${palette.accent} !important; border-color: ${palette.accent} !important; background-image: url("data:image/svg+xml,%3Csvg width='22' height='14' viewBox='-2 0 20 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m6.5 12.6-6.1-6 2.2-2.2 3.9 4L13.9.9l2.2 2.2-9.6 9.5Z' fill='${hex}' /%3E%3C/svg%3E") !important; }`;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const output = [
    `/* Gruvbox theme for RemNote`,
    ` * Source: https://github.com/security-log/remnote-gruvbox`,
    ` * Palette: https://github.com/morhetz/gruvbox`,
    ` */`,
    "",
    cssVarBlock(".dark",  DARK),
    "",
    cssVarBlock(".light", LIGHT),
    "",
    componentCSS(),
    "",
    checkboxCSS(DARK,  ".dark"),
    checkboxCSS(LIGHT, ".light"),
    "",
  ].join("\n");

  const outPath = path.join(__dirname, "../public/theme.css");
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`Written ${outPath} (${(output.length / 1024).toFixed(1)} KB)`);
}

main();
