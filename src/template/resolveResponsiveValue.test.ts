import { describe, expect, it } from "vitest";
import {
  resolveElementContent,
  resolveElementLayout,
  resolveElementStyle,
} from "./resolveResponsiveValue";
import type { TemplateElement } from "./templateTypes";

const element: TemplateElement = {
  id: "sample-heading",
  type: "text",
  name: "Sample Heading",
  children: [],
  content: {
    role: "heading1",
    text: "Desktop heading",
  },
  style: {
    color: "#111111",
    textAlign: "left",
  },
  layout: {
    columns: 2,
    padding: "40px",
    variant: "hero-heading",
  },
  revisions: {
    base: 0,
    desktop: 0,
    tablet: 0,
    mobile: 0,
  },
  overrides: {
    mobile: {
      content: {
        text: "Mobile heading",
      },
      style: {
        textAlign: "center",
      },
      layout: {
        columns: 1,
      },
    },
  },
};

describe("resolveResponsiveValue helpers", () => {
  it("prefers viewport content overrides and keeps base fallback fields", () => {
    expect(resolveElementContent(element, "mobile")).toEqual({
      role: "heading1",
      text: "Mobile heading",
    });
  });

  it("prefers viewport style overrides while falling back to base style values", () => {
    expect(resolveElementStyle(element, "mobile")).toEqual({
      color: "#111111",
      textAlign: "center",
    });
  });

  it("prefers viewport layout overrides while falling back to base layout values", () => {
    expect(resolveElementLayout(element, "mobile")).toEqual({
      columns: 1,
      padding: "40px",
      variant: "hero-heading",
    });
  });

  it("falls back to base values when no viewport override exists", () => {
    expect(resolveElementContent(element, "tablet")).toEqual(element.content);
    expect(resolveElementStyle(element, "tablet")).toEqual(element.style);
    expect(resolveElementLayout(element, "tablet")).toEqual(element.layout);
  });
});
