export interface CustomColors {
  base?: string;
  mantle?: string;
  crust?: string;
  [key: string]: string | undefined;
}

export interface ColorDefinition {
  /** Hex color code e.g. "#282828" */
  hex: string;
  /** RGB string e.g. "rgb(40, 40, 40)" */
  rgb: string;
  /** HSL string e.g. "hsl(0, 0%, 16%)" */
  hsl: string;
  /** Raw RGB components e.g. "40, 40, 40" */
  raw: string;
}

export type GruvboxVariant = "dark" | "light";

export type AccentColor =
  | "yellow"
  | "orange"
  | "red"
  | "green"
  | "blue"
  | "purple"
  | "aqua";
