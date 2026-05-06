// less is a CJS module; require avoids the "no exports" webpack warning
// eslint-disable-next-line @typescript-eslint/no-require-imports
const less = require("less") as typeof import("less");
import tinycolor from "tinycolor2";
import { ColorDefinition, CustomColors } from "../types";
import { extractColorComponents, hasKey, normalizeHexCode } from "../utils/themeUtils";

// Gruvbox palette sourced from https://github.com/morhetz/gruvbox
//
// Naming convention used here → official Gruvbox name:
//   base     → dark0 / light0      (main background)
//   mantle   → dark0_hard / light0_soft  (secondary background)
//   crust    → dark0_soft / light1  (tertiary / sidebar background)
//   surface0 → dark1 / light1
//   surface1 → dark2 / light2
//   surface2 → dark3 / light3
//   overlay0 → dark4 / light4
//   overlay1 → gray_245 (#928374)
//   overlay2 → light3 / dark3
//   subtext0 → light2 / dark2
//   subtext1 → light1 / dark1
//   text     → light1 / dark0
//   Accents (dark)  → bright_*   (e.g. bright_yellow #fabd2f)
//   Accents (light) → neutral_*  (e.g. neutral_yellow #d79921)
//
// Note: morhetz defines 3 bg levels (hard/medium/soft). We map 4 levels
// (base/mantle/crust + surfaces), so for dark/dark-hard the crust value
// reuses dark0_hard — the official darkest bg color.

const DARK_ACCENTS = {
  red:    "#fb4934", // bright_red
  orange: "#fe8019", // bright_orange
  yellow: "#fabd2f", // bright_yellow
  green:  "#b8bb26", // bright_green
  blue:   "#83a598", // bright_blue
  purple: "#d3869b", // bright_purple
  aqua:   "#8ec07c", // bright_aqua
  peach:  "#fe8019", // alias → bright_orange
  mauve:  "#d3869b", // alias → bright_purple
};

const LIGHT_ACCENTS = {
  red:    "#cc241d", // neutral_red
  orange: "#d65d0e", // neutral_orange
  yellow: "#d79921", // neutral_yellow
  green:  "#98971a", // neutral_green
  blue:   "#458588", // neutral_blue
  purple: "#b16286", // neutral_purple
  aqua:   "#689d6a", // neutral_aqua
  peach:  "#d65d0e", // alias → neutral_orange
  mauve:  "#b16286", // alias → neutral_purple
};

const gruvboxPalettes: Record<string, Record<string, string>> = {
  // ── Dark variants ──────────────────────────────────────────────────────────
  dark: {
    base:     "#282828", // dark0
    mantle:   "#1d2021", // dark0_hard
    crust:    "#1d2021", // dark0_hard (morhetz has no darker official bg)
    surface0: "#3c3836", // dark1
    surface1: "#504945", // dark2
    surface2: "#665c54", // dark3
    overlay0: "#7c6f64", // dark4
    overlay1: "#928374", // gray_245
    overlay2: "#bdae93", // light3
    subtext0: "#d5c4a1", // light2
    subtext1: "#ebdbb2", // light1
    text:     "#ebdbb2", // light1
    ...DARK_ACCENTS,
  },
  "dark-hard": {
    base:     "#1d2021", // dark0_hard
    mantle:   "#1d2021", // dark0_hard (no official darker level)
    crust:    "#1d2021", // dark0_hard
    surface0: "#3c3836", // dark1
    surface1: "#504945", // dark2
    surface2: "#665c54", // dark3
    overlay0: "#7c6f64", // dark4
    overlay1: "#928374", // gray_245
    overlay2: "#bdae93", // light3
    subtext0: "#d5c4a1", // light2
    subtext1: "#ebdbb2", // light1
    text:     "#ebdbb2", // light1
    ...DARK_ACCENTS,
  },
  "dark-soft": {
    base:     "#32302f", // dark0_soft
    mantle:   "#282828", // dark0
    crust:    "#1d2021", // dark0_hard
    surface0: "#3c3836", // dark1
    surface1: "#504945", // dark2
    surface2: "#665c54", // dark3
    overlay0: "#7c6f64", // dark4
    overlay1: "#928374", // gray_245
    overlay2: "#bdae93", // light3
    subtext0: "#d5c4a1", // light2
    subtext1: "#ebdbb2", // light1
    text:     "#ebdbb2", // light1
    ...DARK_ACCENTS,
  },
  // ── Light variants ─────────────────────────────────────────────────────────
  light: {
    base:     "#fbf1c7", // light0
    mantle:   "#f2e5bc", // light0_soft  (secondary bg, slightly warmer)
    crust:    "#ebdbb2", // light1       (sidebar, clearly distinct)
    surface0: "#d5c4a1", // light2
    surface1: "#bdae93", // light3
    surface2: "#a89984", // light4
    overlay0: "#928374", // gray_245
    overlay1: "#7c6f64", // dark4
    overlay2: "#665c54", // dark3
    subtext0: "#504945", // dark2
    subtext1: "#3c3836", // dark1
    text:     "#282828", // dark0
    ...LIGHT_ACCENTS,
  },
  "light-hard": {
    base:     "#f9f5d7", // light0_hard
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
    ...LIGHT_ACCENTS,
  },
  "light-soft": {
    base:     "#f2e5bc", // light0_soft
    mantle:   "#fbf1c7", // light0      (warmer secondary)
    crust:    "#ebdbb2", // light1      (sidebar)
    surface0: "#d5c4a1", // light2
    surface1: "#bdae93", // light3
    surface2: "#a89984", // light4
    overlay0: "#928374", // gray_245
    overlay1: "#7c6f64", // dark4
    overlay2: "#665c54", // dark3
    subtext0: "#504945", // dark2
    subtext1: "#3c3836", // dark1
    text:     "#282828", // dark0
    ...LIGHT_ACCENTS,
  },
};

function generateColorVariables(name: string, def: ColorDefinition): string {
  return (
    `@${name}-raw: ${def.raw};\n` +
    `@${name}-hsl: ${def.hsl};\n` +
    `@${name}-rgb: ${def.rgb};\n` +
    `@${name}: ${def.hex};\n`
  );
}

function compileLess(
  lessData: string,
  accent: string,
  palette: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    less.render(lessData, (err: any, output: any) => {
      if (err) {
        reject(err);
        return;
      }
      let css: string = output.css;
      const accentHex = palette[accent] ?? palette["yellow"] ?? "#fabd2f";
      const accentUrlEncoded = accentHex.replace("#", "%23");
      css = css.replace(/CHECKBOX_ACCENT__/g, accentUrlEncoded);
      resolve(css);
    });
  });
}

export async function formTheme(
  theme: string,
  masterTheme: string,
  accent: string,
  customColors: CustomColors,
): Promise<string> {
  const palette = gruvboxPalettes[theme] ?? gruvboxPalettes["dark"];
  const isLight = theme.startsWith("light");

  let themeData = masterTheme
    .replace(/"appearance"/g, isLight ? ".light" : ".dark")
    .replace(/"appearance-no-dot"/g, isLight ? "light" : "dark");

  // Set accent variable — default is yellow in theme.less
  themeData = themeData.replace(/@accent: @yellow;/g, `@accent: @${accent};`);

  let lessVars = "";

  for (const [colorName, hexValue] of Object.entries(palette)) {
    const hex = (customColors[colorName] && customColors[colorName] !== "")
      ? normalizeHexCode(customColors[colorName] as string)
      : hexValue;

    lessVars += generateColorVariables(colorName, extractColorComponents(hex));
  }

  // Also inject @accent as its own set of variables
  const accentHex = palette[accent] ?? palette["yellow"] ?? "#fabd2f";
  lessVars += generateColorVariables("accent", extractColorComponents(accentHex));

  themeData = lessVars + themeData;
  return compileLess(themeData, accent, palette);
}
