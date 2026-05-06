import { RNPlugin } from "@remnote/plugin-sdk";
import { checkAndApplyTheme } from "../theme/themeManager";
import { detectDarkMode } from "./themeUtils";

let observer: MutationObserver | null = null;

export function setupThemeDetection(plugin: RNPlugin): void {
  if (observer) observer.disconnect();

  let lastDarkMode = detectDarkMode();

  observer = new MutationObserver(() => {
    const isDark = detectDarkMode();
    if (isDark !== lastDarkMode) {
      lastDarkMode = isDark;
      checkAndApplyTheme(plugin);
    }
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

export function cleanupThemeDetection(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
