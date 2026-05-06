// less is a CJS module; require avoids the "no exports" webpack warning
// eslint-disable-next-line @typescript-eslint/no-require-imports
const less = require("less") as typeof import("less");
import tinycolor from "tinycolor2";
import { ColorDefinition, CustomColors } from "../types";
import { extractColorComponents, hasKey, normalizeHexCode } from "../utils/themeUtils";

// Gruvbox palette — all hex values
const gruvboxPalettes: Record<string, Record<string, string>> = {
  // ── Dark variants ──────────────────────────────────────────────────────────
  dark: {
    base:     "#282828",
    mantle:   "#1d2021",
    crust:    "#141617",
    surface0: "#3c3836",
    surface1: "#504945",
    surface2: "#665c54",
    overlay0: "#7c6f64",
    overlay1: "#a89984",
    overlay2: "#bdae93",
    subtext0: "#d5c4a1",
    subtext1: "#ebdbb2",
    text:     "#ebdbb2",
    red:      "#fb4934",
    orange:   "#fe8019",
    yellow:   "#fabd2f",
    green:    "#b8bb26",
    blue:     "#83a598",
    purple:   "#d3869b",
    aqua:     "#8ec07c",
    // aliases used by theme.less (peach → orange, mauve → purple)
    peach:    "#fe8019",
    mauve:    "#d3869b",
  },
  "dark-hard": {
    base:     "#1d2021",
    mantle:   "#141617",
    crust:    "#0d0f0f",
    surface0: "#3c3836",
    surface1: "#504945",
    surface2: "#665c54",
    overlay0: "#7c6f64",
    overlay1: "#a89984",
    overlay2: "#bdae93",
    subtext0: "#d5c4a1",
    subtext1: "#ebdbb2",
    text:     "#ebdbb2",
    red:      "#fb4934",
    orange:   "#fe8019",
    yellow:   "#fabd2f",
    green:    "#b8bb26",
    blue:     "#83a598",
    purple:   "#d3869b",
    aqua:     "#8ec07c",
    peach:    "#fe8019",
    mauve:    "#d3869b",
  },
  "dark-soft": {
    base:     "#32302f",
    mantle:   "#282828",
    crust:    "#1d2021",
    surface0: "#3c3836",
    surface1: "#504945",
    surface2: "#665c54",
    overlay0: "#7c6f64",
    overlay1: "#a89984",
    overlay2: "#bdae93",
    subtext0: "#d5c4a1",
    subtext1: "#ebdbb2",
    text:     "#ebdbb2",
    red:      "#fb4934",
    orange:   "#fe8019",
    yellow:   "#fabd2f",
    green:    "#b8bb26",
    blue:     "#83a598",
    purple:   "#d3869b",
    aqua:     "#8ec07c",
    peach:    "#fe8019",
    mauve:    "#d3869b",
  },
  // ── Light variants ─────────────────────────────────────────────────────────
  light: {
    base:     "#fbf1c7",
    mantle:   "#f9f5d7",
    crust:    "#f2e5bc",
    surface0: "#ebdbb2",
    surface1: "#d5c4a1",
    surface2: "#bdae93",
    overlay0: "#a89984",
    overlay1: "#7c6f64",
    overlay2: "#665c54",
    subtext0: "#504945",
    subtext1: "#3c3836",
    text:     "#282828",
    red:      "#cc241d",
    orange:   "#d65d0e",
    yellow:   "#d79921",
    green:    "#98971a",
    blue:     "#458588",
    purple:   "#b16286",
    aqua:     "#689d6a",
    peach:    "#d65d0e",
    mauve:    "#b16286",
  },
  "light-hard": {
    base:     "#f9f5d7",
    mantle:   "#f2e5bc",
    crust:    "#ebdbb2",
    surface0: "#d5c4a1",
    surface1: "#bdae93",
    surface2: "#a89984",
    overlay0: "#7c6f64",
    overlay1: "#665c54",
    overlay2: "#504945",
    subtext0: "#3c3836",
    subtext1: "#282828",
    text:     "#1d2021",
    red:      "#cc241d",
    orange:   "#d65d0e",
    yellow:   "#d79921",
    green:    "#98971a",
    blue:     "#458588",
    purple:   "#b16286",
    aqua:     "#689d6a",
    peach:    "#d65d0e",
    mauve:    "#b16286",
  },
  "light-soft": {
    base:     "#f2e5bc",
    mantle:   "#fbf1c7",
    crust:    "#f9f5d7",
    surface0: "#ebdbb2",
    surface1: "#d5c4a1",
    surface2: "#bdae93",
    overlay0: "#a89984",
    overlay1: "#7c6f64",
    overlay2: "#665c54",
    subtext0: "#504945",
    subtext1: "#3c3836",
    text:     "#282828",
    red:      "#cc241d",
    orange:   "#d65d0e",
    yellow:   "#d79921",
    green:    "#98971a",
    blue:     "#458588",
    purple:   "#b16286",
    aqua:     "#689d6a",
    peach:    "#d65d0e",
    mauve:    "#b16286",
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
