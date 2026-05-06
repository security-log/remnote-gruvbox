import { declareIndexPlugin, RNPlugin } from "@remnote/plugin-sdk";
import { registerPluginSettings } from "../utils/settingsManager";
import { checkAndApplyTheme } from "../theme/themeManager";
import { setupThemeDetection, cleanupThemeDetection } from "../utils/themeDetection";

async function onActivate(plugin: RNPlugin) {
  console.log("Gruvbox Theme Plugin activated");

  try {
    await registerPluginSettings(plugin);
    await checkAndApplyTheme(plugin);
    setupThemeDetection(plugin);

    plugin.track(async (newPlugin) => {
      await newPlugin.settings.getSetting("light-theme");
      await newPlugin.settings.getSetting("dark-theme");
      await newPlugin.settings.getSetting("accent-color");
      await checkAndApplyTheme(newPlugin);
    });
  } catch (error) {
    console.error("Error during plugin activation:", error);
    plugin.app.toast("Error initializing Gruvbox theme. Check console for details.");
  }
}

async function onDeactivate(plugin: RNPlugin) {
  console.log("Gruvbox Theme Plugin deactivated");
  await plugin.app.registerCSS("gruvbox-palette", "");
  cleanupThemeDetection();
}

declareIndexPlugin(onActivate, onDeactivate);
