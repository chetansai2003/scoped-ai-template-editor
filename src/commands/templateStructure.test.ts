import { describe, expect, it } from "vitest";
import { northstarTemplate } from "../template/northstarTemplate";
import type { TemplateDocument } from "../template/templateTypes";
import { validateTemplateStructure } from "./templateStructure";

function cloneTemplate(): TemplateDocument {
  return structuredClone(northstarTemplate);
}

describe("validateTemplateStructure", () => {
  it("accepts the Northstar canonical tree", () => {
    expect(validateTemplateStructure(cloneTemplate())).toBeNull();
  });

  it("rejects a missing root", () => {
    const template = cloneTemplate();
    delete template.elements["page-root"];

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
    });
  });

  it("rejects a missing child", () => {
    const template = cloneTemplate();
    delete template.elements["hero-section"];

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
      elementId: "hero-section",
    });
  });

  it("rejects duplicate child references", () => {
    const template = cloneTemplate();
    template.elements["page-root"].children.push("hero-section");

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
    });
  });

  it("rejects self-parenting", () => {
    const template = cloneTemplate();
    template.elements["hero-section"].parentId = "hero-section";

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
      elementId: "hero-section",
    });
  });

  it("rejects ancestor cycles", () => {
    const template = cloneTemplate();
    template.elements["page-root"].children = ["hero-section"];
    template.elements["hero-section"].children = ["page-root"];
    template.elements["page-root"].parentId = "hero-section";

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
    });
  });

  it("rejects parent and child mismatches", () => {
    const template = cloneTemplate();
    template.elements["hero-section"].parentId = "features-section";

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
      elementId: "hero-section",
    });
  });

  it("rejects unreachable elements", () => {
    const template = cloneTemplate();
    template.elements["page-root"].children = template.elements[
      "page-root"
    ].children.filter((childId) => childId !== "footer-section");

    expect(validateTemplateStructure(template)).toMatchObject({
      code: "INVALID_TEMPLATE_STRUCTURE",
      elementId: "footer-section",
    });
  });
});
