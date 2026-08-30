import type { CommandError, JsonValue } from "./commandTypes";
import type { EditScope } from "../template/templateTypes";

const colorPattern =
  /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\)|transparent)$/;
const dimensionPattern = /^(\d{1,4}(\.\d{1,2})?(px|rem|em|%)|0)$/;
const spacingPattern =
  /^(\d{1,4}(\.\d{1,2})?(px|rem|em|%)|0)(\s+(\d{1,4}(\.\d{1,2})?(px|rem|em|%)|0)){0,3}$/;
const shadowPattern =
  /^(none|0\s+\d{1,3}px\s+\d{1,3}px\s+rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\))$/;

const textRoles = new Set(["span", "paragraph", "heading1", "heading2", "heading3"]);
const textAlignments = new Set(["left", "center", "right"]);
const tones = new Set(["dark", "light", "muted", "accent"]);
const alignments = new Set(["start", "center", "end", "stretch"]);
const layoutVariants = new Set([
  "actions",
  "actions stacked",
  "card-body",
  "card-title",
  "cta",
  "cta-heading",
  "eyebrow",
  "feature-card",
  "feature-grid",
  "footer",
  "footer-copy",
  "hero",
  "hero-copy",
  "hero-heading",
  "hero-heading compact",
  "hero-visual",
  "lead",
  "lead centered",
  "page",
  "primary-button",
  "primary-button centered",
  "process",
  "process-card",
  "secondary-button",
  "section-heading",
  "stat",
  "stats",
  "top-nav",
]);

export function validateNewValue(
  scope: EditScope,
  fieldName: string,
  value: JsonValue,
): CommandError | null {
  if (value === null) {
    return null;
  }

  if (scope === "content") {
    return validateContentValue(fieldName, value);
  }

  if (scope === "style") {
    return validateStyleValue(fieldName, value);
  }

  return validateLayoutValue(fieldName, value);
}

function validateContentValue(
  fieldName: string,
  value: JsonValue,
): CommandError | null {
  if (fieldName === "text" || fieldName === "label" || fieldName === "alt") {
    return validateStringLength(value, fieldName === "text" ? 280 : 160);
  }

  if (fieldName === "href") {
    if (typeof value !== "string" || value.length > 220) {
      return invalidValue("Links must be strings under 220 characters.");
    }

    if (!isSafeHref(value)) {
      return invalidValue("Links must use safe http, https, mailto, hash, or relative URLs.");
    }

    return null;
  }

  if (fieldName === "src") {
    if (typeof value !== "string" || value.length > 320) {
      return invalidValue("Image sources must be strings under 320 characters.");
    }

    if (!isSafeImageSource(value)) {
      return invalidValue("Image sources must use safe http, https, data:image, or relative URLs.");
    }

    return null;
  }

  if (fieldName === "role") {
    return typeof value === "string" && textRoles.has(value)
      ? null
      : invalidValue("Text role is not supported.");
  }

  return invalidValue("Content field is not supported.");
}

function validateStyleValue(
  fieldName: string,
  value: JsonValue,
): CommandError | null {
  if (
    fieldName === "background" ||
    fieldName === "borderColor" ||
    fieldName === "color"
  ) {
    return typeof value === "string" && colorPattern.test(value)
      ? null
      : invalidValue("Color value is not supported.");
  }

  if (fieldName === "radius") {
    return typeof value === "string" && dimensionPattern.test(value)
      ? null
      : invalidValue("Radius must be a safe CSS dimension.");
  }

  if (fieldName === "fontSize") {
    return typeof value === "number" && value >= 10 && value <= 96
      ? null
      : invalidValue("Font size must be a number between 10 and 96.");
  }

  if (fieldName === "fontWeight") {
    const weights = new Set([400, 500, 600, 700, 800]);

    return typeof value === "number" && weights.has(value)
      ? null
      : invalidValue("Font weight must be 400, 500, 600, 700, or 800.");
  }

  if (fieldName === "shadow") {
    return typeof value === "string" && shadowPattern.test(value)
      ? null
      : invalidValue("Shadow value is not supported.");
  }

  if (fieldName === "textAlign") {
    return typeof value === "string" && textAlignments.has(value)
      ? null
      : invalidValue("Text alignment is not supported.");
  }

  if (fieldName === "tone") {
    return typeof value === "string" && tones.has(value)
      ? null
      : invalidValue("Tone is not supported.");
  }

  return invalidValue("Style field is not supported.");
}

function validateLayoutValue(
  fieldName: string,
  value: JsonValue,
): CommandError | null {
  if (fieldName === "columns") {
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 4
      ? null
      : invalidValue("Columns must be an integer between 1 and 4.");
  }

  if (
    fieldName === "gap" ||
    fieldName === "margin" ||
    fieldName === "maxWidth" ||
    fieldName === "padding"
  ) {
    return typeof value === "string" && spacingPattern.test(value)
      ? null
      : invalidValue("Layout spacing must be a safe CSS spacing value.");
  }

  if (
    fieldName === "height" ||
    fieldName === "minHeight" ||
    fieldName === "minWidth" ||
    fieldName === "width"
  ) {
    return typeof value === "number" && value >= 0 && value <= 2400
      ? null
      : invalidValue("Layout size values must be safe non-negative numbers.");
  }

  if (fieldName === "offsetX" || fieldName === "offsetY") {
    return typeof value === "number" && value >= -2000 && value <= 2000
      ? null
      : invalidValue("Layout offset values must be safe numbers.");
  }

  if (fieldName === "visible") {
    return typeof value === "boolean"
      ? null
      : invalidValue("Visibility must be a boolean.");
  }

  if (fieldName === "align") {
    return typeof value === "string" && alignments.has(value)
      ? null
      : invalidValue("Alignment is not supported.");
  }

  if (fieldName === "variant") {
    return typeof value === "string" && layoutVariants.has(value)
      ? null
      : invalidValue("Layout variant is not supported.");
  }

  return invalidValue("Layout field is not supported.");
}

function validateStringLength(value: JsonValue, maxLength: number): CommandError | null {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? null
    : invalidValue(`Text values must be non-empty strings under ${maxLength} characters.`);
}

function isSafeHref(value: string): boolean {
  const lowerValue = value.trim().toLowerCase();

  return (
    lowerValue.startsWith("#") ||
    lowerValue.startsWith("/") ||
    lowerValue.startsWith("http://") ||
    lowerValue.startsWith("https://") ||
    lowerValue.startsWith("mailto:")
  );
}

function isSafeImageSource(value: string): boolean {
  const lowerValue = value.trim().toLowerCase();

  return (
    lowerValue.startsWith("/") ||
    lowerValue.startsWith("http://") ||
    lowerValue.startsWith("https://") ||
    lowerValue.startsWith("data:image/")
  );
}

function invalidValue(message: string): CommandError {
  return {
    code: "INVALID_VALUE",
    message,
  };
}
