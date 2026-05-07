#!/usr/bin/env node
// Builds theme.css by hardcoding Gruvbox colors directly into every rule,
// exactly like the Dracula theme does. No CSS custom properties in component
// rules means no dependency on body.dark/body.light class placement.
//
// Dark/light switching is handled by scoping rules under .dark / .light
// (RemNote toggles one of these classes on a root element).

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

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

// ── Generate CSS for one palette ───────────────────────────────────────────────

function themeCSS(p, scope) {
  const s          = sel => `${scope} ${sel}`;
  const accentDark = darken(p.accent, 20);
  const checkboxAccent = p.accent.replace("#", "%23");

  return `
/* ══════════════════════════════════════════════════════════
   Gruvbox — ${scope === ".dark" ? "Dark" : "Light"} mode
   ══════════════════════════════════════════════════════════ */

/* RemNote design tokens */
${s(":root")},
${scope} {
  --rn-clr-background-primary:      ${p.base};
  --rn-clr-background-secondary:    ${p.mantle};
  --rn-clr-background-tertiary:     ${p.crust};
  --rn-clr-content-primary:         ${p.text};
  --rn-clr-border-opaque:           ${p.surface1};
  --rn-colors-gray-10:              ${p.surface0};
  --rn-colors-gray-30:              ${p.surface1};
  --rn-colors-gray-60:              ${p.overlay2};
  --rn-colors-gray-80:              ${p.text};
  --rn-colors-gray-90:              ${p.text};
  --rn-colors-gray-100:             ${p.text};
  --rn-clr-background-elevation-10: ${p.base};
  --rn-clr-background-elevation-50: ${p.surface0};
  --bg-mint-20:             ${p.aqua};
  --bg-purple-20:           ${p.purple};
  --bg-cyan-20:             ${p.blue};
  --bg-yellow-20:           ${p.yellow};
  --bg-orange-20:           ${p.orange};
  --bg-red-20:              ${p.red};
  --highlight-color-red:    ${p.red};
  --highlight-color-orange: ${p.orange};
  --highlight-color-yellow: ${p.yellow};
  --highlight-color-blue:   ${p.blue};
  --highlight-color-purple: ${p.purple};
  --highlight-color-green:  ${p.green};
  --tw-bg-opacity: 0.7;
  --tw-bg-opacity-highlight: var(--tw-bg-opacity);
}

/* Platform */
${s(".rn-platform")} { background: ${p.base} !important; color: ${p.text} !important; }

/* Body-level color so everything inherits */
${scope} { background-color: ${p.base}; color: ${p.text}; }

/* Design token classes */
${s(".rn-clr-background-primary")}         { background-color: ${p.base}     !important; }
${s(".rn-clr-background-secondary")}       { background-color: ${p.mantle}   !important; }
${s(".rn-clr-background-tertiary")}        { background-color: ${p.crust}    !important; }
${s(".rn-clr-background")}                 { background-color: ${p.base}     !important; }
${s(".rn-clr-background-light-accent")}    { background-color: ${p.surface1} !important; }
${s(".rn-clr-background-accent")}          { background-color: ${p.accent}   !important; }
${s(".rn-clr-background-accent--hovered")} { background-color: ${p.accent}   !important; }
${s(".rn-clr-background-elevation-5")},
${s(".rn-clr-background-elevation-10")},
${s(".rn-clr-background-elevation-15")},
${s(".rn-clr-background-elevation-20")}    { background: ${p.surface0} !important; }
${s(".rn-clr-background-elevation-30")},
${s(".rn-clr-background-elevation-40")},
${s(".rn-clr-background-elevation-50")}    { background: ${p.surface1} !important; }
${s(".rn-clr-content-primary")}            { color: ${p.text}     !important; }
${s(".rn-clr-content-secondary")}          { color: ${p.subtext1} !important; }
${s(".rn-clr-content-tertiary")}           { color: ${p.overlay2} !important; }
${s(".rn-clr-content-on-color")}           { color: ${p.text}     !important; }
${s(".rn-clr-content-accent")}             { color: ${p.accent}   !important; }
${s(".rn-clr-content-state-disabled")}     { color: ${p.overlay1} !important; }
${s(".rn-clr-border-opaque")}              { border-color: ${p.surface1} !important; }
${s(".rn-clr-border-selected")}            { border-color: ${p.accent}   !important; }
${s(".rn-clr-border-light-accent")}        { border-color: ${p.surface0} !important; }
${s(".rn-clr-border-accent")}              { border-color: ${p.accent}   !important; }

/* Pane / editor */
${s(".rn-pane__body")}       { background: ${p.base} !important; }
${s(".rn-pane__top-bar")}    { background: ${p.base} !important; border-bottom: 1px solid ${p.surface1} !important; }
${s(".rn-editor")}           { color: ${p.text} !important; }
${s(".rn-editor-container")} { background: ${p.base} !important; }
${s(".rn-document")}         { color: ${p.text} !important; }
${s(".rn-document-wrapper")} { background: ${p.base} !important; }
${s(".rn-sticky-header")}    { background: ${p.base} !important; border-bottom: 1px solid ${p.surface1} !important; }
${s(".top-bar-container")}   { background-color: ${p.base} !important; }

/* Text — match Dracula's approach exactly */
${s(".rn-editor__rem__body__text")} { color: ${p.text} !important; }
${s(".rem-text")}                   { color: ${p.text} !important; }
${s(".rn-rem-text")}                { color: ${p.text} !important; }

/* Navigation bar */
${s(".rn-navigation-bar")} { background: ${p.mantle} !important; border-bottom: 1px solid ${p.surface1} !important; }

/* Sidebar */
${s(".rn-sidebar")}          { background: ${p.crust} !important; color: ${p.subtext1} !important; border-right: 1px solid ${p.surface1} !important; }
${s(".rn-document-sidebar")} { background: ${p.crust} !important; border-right: 1px solid ${p.surface1} !important; }
${s("#document-sidebar")}    { background-color: ${p.crust} !important; }
${s(".rn-sidebar-counter")}  { color: ${p.overlay2} !important; }
${s(".mosaic-tile")}         { border-color: ${p.surface1}; }

/* Document header */
${s(".rn-doc-header")} { background: ${p.base} !important; color: ${p.text} !important; border-bottom: 1px solid ${p.surface1} !important; }
${s(".rn-doc-title")}  { color: ${p.text} !important; }

/* All Notes / folder view */
${s(".rn-all-notes")}        { background: ${p.base} !important; color: ${p.text} !important; }
${s(".rn-folder-page")}      { background: ${p.base} !important; color: ${p.text} !important; }
${s(".rn-document-card")}    { background: ${p.surface0} !important; border-color: ${p.surface1} !important; color: ${p.text} !important; }
${s(".rn-mosaic-card")}      { background: ${p.surface0} !important; border-color: ${p.surface1} !important; color: ${p.text} !important; }
${s(".rn-tree-node")}        { color: ${p.text} !important; }
${s(".rn-tree-node__label")} { color: ${p.text} !important; }

/* Omnibar / Search */
${s("div[data-cy=\"omnibar\"]")}           { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }
${s("div[data-omnibar-results=\"true\"]")} { background: ${p.surface0} !important; }
${s(".rn-omnibar")}   { background: ${p.surface0} !important; }
${s(".rn-search")}    { background: ${p.surface0} !important; }
${s("#search-results__result")} { color: ${p.text}; margin-top: 4px; margin-bottom: 4px; }
${s("#search-results__result[data-cmdopt-selected=\"true\"]")} { background-color: ${rgba(p.accent, 0.4)}; }
${s("#search-results__result.rn-clr-background--hovered")}    { background: ${rgba(p.text, 0.05)} !important; }
${s("#search-results__no-results")} { background: ${p.surface0} !important; color: ${p.overlay2} !important; }
${s(".rich-text-editor__search-results div[data-search-result=\"search-result-panel\"]")} { background: ${p.surface0} !important; }
${s(".rn-ctrl-f")} { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }

/* Floating toolbar */
${s(".rn-floating-toolbar")}         { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }
${s(".rn-floating-toolbar-wrapper")} { border-color: ${p.surface1} !important; }
${s(".rn-background-toolbar")}       { background-color: ${p.surface0} !important; }

/* Popups / Menus */
${s(".rn-popup.popup-menu > .rn-popup__content")} { background: ${p.surface0} !important; }
${s(".rn-popup")}            { background: ${p.surface0} !important; }
${s(".rn-popup-background")} { background: ${p.surface0} !important; }
${s(".rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden")} { background-color: ${p.surface0} !important; }
${s(".rn-popup__content.relative.rn-clr-background-primary.overflow-y-hidden.overflow-x-hidden")} { background-color: ${p.base} !important; }
${s(".rn-menu")}   { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }
${s(".rn-clr-shadow-menu")} { background: ${p.surface0} !important; }
${s(".rn-clr-shadow-default")},
${s(".rn-clr-shadow-card")},
${s(".rn-clr-shadow-menu")},
${s(".rn-clr-shadow-modal")}   { box-shadow: 0 2px 8px ${rgba(p.crust, 0.4)} !important; }
${s(".remnote-tooltip-container")} { background: ${p.surface1} !important; color: ${p.text} !important; }
${s(".pricing-feature-tooltip")}   { background: ${p.surface1} !important; color: ${p.text} !important; }
${s(".table-background-overlay")}  { background: ${p.base} !important; }
${s(".rn-dialog")}            { background: ${p.surface0} !important; }
${s(".rn-dialog-background")} { background: ${rgba(p.crust, 0.5)} !important; }
${s(".rn-sort-popup")}   { background: ${p.surface0} !important; }
${s(".rn-paste-popup")}  { background: ${p.surface0} !important; }
${s("div[data-cy=\"selected-text-menu\"]")} { background: ${p.surface0} !important; }
${s(".rn-document-preview")} { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }

/* Tags / References */
${s(".rn-tag")}           { color: ${p.subtext1} !important; }
${s(".rn-rem-reference")} { color: ${p.accent}   !important; }
${s(".rn-search-portal")} { border-color: ${p.surface1} !important; }
${s(".rn-work-in-progress-rem")} { background: ${p.surface0} !important; color: ${p.text} !important; }

/* Bullets */
${s(".rn-rem-bullet")}       { color: ${p.overlay1} !important; }
${s(".rn-bullet-container")} { color: ${p.overlay1} !important; }
${s(".rn-list-number")}      { color: ${p.overlay2} !important; }

/* Code blocks */
${s(".rn-code-node")} { background: ${p.surface0} !important; color: ${p.text} !important; border-color: ${p.surface1} !important; }

/* Headings */
${s(".rn-text-heading-large")},
${s(".rn-text-heading-medium")},
${s(".rn-text-heading-small")},
${s(".rn-text-heading-xsmall")} { color: ${p.text} !important; }

/* Quote */
${s(".rn-quote")}         { border-color: ${p.accent}   !important; }
${s(".rn-quote-inner")}   { color:        ${p.subtext1} !important; }
${s(".rn-quote-content")} { color:        ${p.subtext1} !important; }

/* Cards / Dividers */
${s(".rn-card3")}         { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }
${s(".rn-divider")}       { background: ${p.surface1} !important; }
${s(".rn-editor-divider")} { background: ${p.surface1} !important; }
${s(".rn-progress-bar")}  { background: ${p.surface0} !important; }

/* Buttons / Switches */
${s(".rn-button")}       { color: ${p.text} !important; background-color: ${p.mantle} !important; border-color: ${p.surface1} !important; transition: background-color 0.1s ease-in-out; }
${s(".rn-button:hover")} { background-color: ${p.surface0} !important; }
${s(".rn-button--primary")},
${s(".rn-button.rn-button--primary")}       { color: ${p.crust} !important; background-color: ${p.accent} !important; border-color: ${p.accent} !important; }
${s(".rn-button--primary:hover")},
${s(".rn-button.rn-button--primary:hover")} { color: ${p.crust} !important; background-color: ${accentDark} !important; }
${s(".rn-checkbox")}      { border-color: ${p.surface1} !important; }
${s(".rn-switch")}        { background: ${p.crust} !important; box-sizing: content-box; }
${s(".rn-switch[data-state=\"checked\"]")} { background-color: ${p.crust} !important; border-color: ${p.accent} !important; border-width: 2.1px !important; border-style: solid !important; }
${s(".rn-switch-handle")} { background: ${p.surface0} !important; }
${s(".rn-settings__link:hover")} { background-color: ${p.mantle} !important; border-radius: 4px; }
${s(".rn-settings__link.rn-clr-content-accent")} { color: ${p.accent}; }

/* Checkboxes */
${s(".rn-checkbox--checked")}   { background-color: ${p.surface0} !important; color: ${p.accent} !important; border-color: ${p.accent} !important; background-image: url("data:image/svg+xml,%3Csvg width='22' height='14' viewBox='-2 0 20 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m6.5 12.6-6.1-6 2.2-2.2 3.9 4L13.9.9l2.2 2.2-9.6 9.5Z' fill='${checkboxAccent}' /%3E%3C/svg%3E") !important; }
${s(".rn-checkbox--unchecked")} { color: ${p.accent} !important; background-color: ${p.surface0} !important; border-color: ${p.overlay0} !important; }

/* Settings */
${s(".rn-settings")}  { background: ${p.base} !important; }
${s(".rn-all-notes")} { background: ${p.base} !important; color: ${p.text} !important; }

/* Queue / Review */
${s(".rn-queue-container")}  { background: ${p.mantle} !important; }
${s(".rn-queue")}            { background: ${p.base}   !important; }
${s(".rn-queue-rem")}        { color:      ${p.text}   !important; }
${s(".rn-flashcard-delimiter")} { color:   ${p.overlay1} !important; }
${s(".rn-flashcards-edit")},
${s(".rn-flashcards-home")},
${s(".rn-flashcards-page-container")} { background: ${p.base} !important; }

/* Deck / Study */
${s(".rn-deck-list")}     { background: ${p.base}     !important; }
${s(".rn-study-deck-btn")} { background: ${p.surface0} !important; color: ${p.text} !important; }

/* PDF viewer */
${s(".rn-pdf-viewer")} { background: ${p.base} !important; }

/* Tables */
${s(".rn-table-header")}  { background: ${p.surface0} !important; color: ${p.subtext1} !important; }
${s(".rn-table-row")}     { background: ${p.base}     !important; }
${s(".rn-column-header")} { background: ${p.surface0} !important; }

/* Toast */
${s(".rn-toast")}            { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }
${s(".rn-toast-container")}  { background: ${p.surface0} !important; }
${s(".rn-notification-banner")} { background: ${p.mantle} !important; color: ${p.text} !important; }

/* Plugin sidebar */
${s(".rn-plugin-sidebar")} { background: ${p.mantle}   !important; }
${s(".rn-plugin")}         { background: ${p.surface0} !important; border-color: ${p.surface1} !important; }

/* Cloze */
${s(".cloze")}       { background-color: ${rgba(p.surface2, 0.3)}; border-bottom-color: ${p.accent}; }
${s(".cloze:hover")} { border-bottom-color: ${accentDark}; }
${s(".rn-fill-in-blank")} { border-color: ${p.accent} !important; }
${s(".rn-cloze-button")}  { color:        ${p.accent} !important; }

/* Highlights */
${s(".highlight-color--red")}    { background-color: ${rgba(p.red,    0.7)}; color: ${p.text}; }
${s(".highlight-color--orange")} { background-color: ${rgba(p.orange, 0.7)}; color: ${p.text}; }
${s(".highlight-color--yellow")} { background-color: ${rgba(p.yellow, 0.7)}; color: ${p.text}; }
${s(".highlight-color--blue")}   { background-color: ${rgba(p.blue,   0.7)}; color: ${p.text}; }
${s(".highlight-color--purple")} { background-color: ${rgba(p.purple, 0.7)}; color: ${p.text}; }
${s(".highlight-color--green")}  { background-color: ${rgba(p.green,  0.7)}; color: ${p.text}; }
${s(".rn-highlight-reference")}  { background: ${rgba(p.yellow, 0.15)} !important; }
${s(".rn-html-viewer")}   { background: ${p.base} !important; }
${s(".rn-html-highlight")} { background: ${rgba(p.yellow, 0.2)} !important; }

/* Links */
${s("a")}       { color: ${p.accent}; }
${s("a:hover")} { color: ${p.subtext1}; }
${s(".text-blue-60")}     { color: ${p.accent} !important; }
${s(".rn-rem-reference")} { color: ${p.accent}; }

/* Tab active indicator */
${s("[data-cy-active=\"true\"]")} { border-bottom-color: ${p.accent} !important; }

/* Hover */
${s(".rn-clr-background--hovered")}               { background: ${rgba(p.text, 0.05)} !important; }
${s(".hover\\:rn-clr-background--hovered:hover")} { background: ${p.mantle} !important; }
${s(".hover\\:rn-clr-background-accent--hovered:hover")} { background: ${accentDark} !important; }

/* Learning state icons */
${s("svg[data-icon=\"learning-state-active\"] path")}      { fill:   ${p.green}; }
${s("svg[data-icon=\"learning-state-paused\"] path")}      { stroke: ${p.overlay0}; }
${s("svg[data-icon=\"learning-state-maintaining\"] path")} { stroke: ${p.yellow}; }
${s("svg[data-icon=\"learning-state-maintaining\"] circle")} { fill: ${p.yellow}; }
${s("svg[data-icon=\"learning-state-no-priority\"] path")} { stroke: ${p.overlay2}; }

/* Scrollbar */
${s("::-webkit-scrollbar")}       { width: 8px; height: 8px; }
${s("::-webkit-scrollbar-track")} { background: transparent; }
${s("::-webkit-scrollbar-thumb")} { background: ${p.overlay1}; border-radius: 4px; }
${s("::-webkit-scrollbar-thumb:hover")} { background: ${p.overlay2}; }

/* Selection */
${scope}::selection,
${s("*::selection")} { background: ${rgba(p.accent, 0.35)} !important; }
`.trim();
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const output = [
    `/* Gruvbox theme for RemNote`,
    ` * Source: https://github.com/security-log/remnote-gruvbox`,
    ` * Palette: https://github.com/morhetz/gruvbox`,
    ` */`,
    "",
    themeCSS(DARK,  ".dark"),
    "",
    themeCSS(LIGHT, ".light"),
    "",
  ].join("\n");

  const outPath = path.join(__dirname, "../public/theme.css");
  fs.writeFileSync(outPath, output, "utf8");
  console.log(`Written ${outPath} (${(output.length / 1024).toFixed(1)} KB)`);
}

main();
