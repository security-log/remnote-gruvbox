import tinycolor from "tinycolor2";
import { ColorDefinition } from "../types";

export function detectDarkMode(): boolean {
  // Check document body classes first (most reliable for RemNote)
  if (document.body.classList.contains("dark")) return true;
  if (document.body.classList.contains("light")) return false;
  // Fall back to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function hasKey<T extends object>(obj: T, key: string): key is keyof T & string {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function normalizeHexCode(hex: string): string {
  if (!hex) return "";
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export function extractColorComponents(hex: string): ColorDefinition {
  const color = tinycolor(hex || "#000000");
  const { r, g, b } = color.toRgb();
  return {
    hex: color.toHexString(),
    rgb: color.toRgbString(),
    hsl: color.toHslString(),
    raw: `${r}, ${g}, ${b}`,
  };
}
