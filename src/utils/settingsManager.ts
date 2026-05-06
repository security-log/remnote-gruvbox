import { RNPlugin } from "@remnote/plugin-sdk";

export async function registerPluginSettings(plugin: RNPlugin): Promise<void> {
  await plugin.settings.registerBooleanSetting({
    id: "auto-switch-theme",
    title: "Auto-switch dark/light",
    description: "Automatically switch between dark and light themes based on RemNote's appearance setting",
    defaultValue: true,
  });

  await plugin.settings.registerDropdownSetting({
    id: "dark-theme",
    title: "Dark theme variant",
    description: "Gruvbox variant used in dark mode",
    defaultValue: "dark",
    options: [
      { key: "dark", value: "dark", label: "Dark" },
      { key: "dark-hard", value: "dark-hard", label: "Dark Hard" },
      { key: "dark-soft", value: "dark-soft", label: "Dark Soft" },
    ],
  });

  await plugin.settings.registerDropdownSetting({
    id: "light-theme",
    title: "Light theme variant",
    description: "Gruvbox variant used in light mode",
    defaultValue: "light",
    options: [
      { key: "light", value: "light", label: "Light" },
      { key: "light-hard", value: "light-hard", label: "Light Hard" },
      { key: "light-soft", value: "light-soft", label: "Light Soft" },
    ],
  });

  await plugin.settings.registerDropdownSetting({
    id: "accent-color",
    title: "Accent color",
    description: "Primary accent color used for highlights and interactive elements",
    defaultValue: "yellow",
    options: [
      { key: "yellow", value: "yellow", label: "Yellow" },
      { key: "orange", value: "orange", label: "Orange" },
      { key: "red", value: "red", label: "Red" },
      { key: "green", value: "green", label: "Green" },
      { key: "blue", value: "blue", label: "Blue (Aqua)" },
      { key: "purple", value: "purple", label: "Purple" },
      { key: "aqua", value: "aqua", label: "Aqua" },
    ],
  });

  await plugin.settings.registerStringSetting({
    id: "gruvboxBaseColor",
    title: "Custom base color override",
    description: "Override the main background color (hex code, e.g. #282828)",
    defaultValue: "",
  });

  await plugin.settings.registerStringSetting({
    id: "gruvboxMantleColor",
    title: "Custom mantle color override",
    description: "Override the secondary background color (hex code)",
    defaultValue: "",
  });

  await plugin.settings.registerStringSetting({
    id: "gruvboxCrustColor",
    title: "Custom crust color override",
    description: "Override the tertiary background color (hex code)",
    defaultValue: "",
  });
}
