import { RNPlugin } from "@remnote/plugin-sdk";
import { formTheme } from "./themeBuilder";
import { CustomColors } from "../types";
import { detectDarkMode, normalizeHexCode } from "../utils/themeUtils";

export async function setTheme(
  plugin: RNPlugin,
  theme: string,
  accent: string,
): Promise<string> {
  try {
    const customColors = await getCustomColors(plugin);

    const masterTheme: string = await fetch(
      `${plugin.rootURL}theme.less`,
    ).then((r) => r.text());

    if (!theme || !accent || !masterTheme) {
      console.error("Missing required theme parameters", { theme, accent });
      return "";
    }

    const compiledCSS = await formTheme(theme, masterTheme, accent, customColors);
    await plugin.app.registerCSS("gruvbox-palette", compiledCSS);
    return compiledCSS;
  } catch (error) {
    console.error("Failed to set theme:", error);
    return "";
  }
}

async function getCustomColors(plugin: RNPlugin): Promise<CustomColors> {
  const [base, mantle, crust] = await Promise.all([
    plugin.settings.getSetting("gruvboxBaseColor"),
    plugin.settings.getSetting("gruvboxMantleColor"),
    plugin.settings.getSetting("gruvboxCrustColor"),
  ]);

  return {
    base:   normalizeHexCode((base   as string) || ""),
    mantle: normalizeHexCode((mantle as string) || ""),
    crust:  normalizeHexCode((crust  as string) || ""),
  };
}

export async function applyThemeByAppearance(
  plugin: RNPlugin,
  isDarkMode: boolean,
): Promise<void> {
  try {
    const [theme, accent] = await Promise.all([
      plugin.settings.getSetting(isDarkMode ? "dark-theme" : "light-theme"),
      plugin.settings.getSetting("accent-color"),
    ]);

    const effectiveTheme  = (theme  as string) || (isDarkMode ? "dark" : "light");
    const effectiveAccent = (accent as string) || "yellow";

    await setTheme(plugin, effectiveTheme, effectiveAccent);
  } catch (error) {
    console.error("Error applying theme by appearance:", error);
    await setTheme(plugin, "dark", "yellow");
  }
}

export async function checkAndApplyTheme(plugin: RNPlugin): Promise<void> {
  const isDarkMode  = detectDarkMode();
  const autoSwitch  = await plugin.settings.getSetting("auto-switch-theme");

  if (autoSwitch) {
    await applyThemeByAppearance(plugin, isDarkMode);
  } else {
    await applyThemeByAppearance(plugin, isDarkMode);
  }
}
