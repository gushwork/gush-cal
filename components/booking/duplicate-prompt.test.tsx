import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DuplicatePrompt } from "./duplicate-prompt";

describe("DuplicatePrompt", () => {
  it("renders manage link and continue actions", () => {
    const html = renderToStaticMarkup(
      <DuplicatePrompt
        manageUrl="https://example.com/manage/abc"
        onContinue={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('data-testid="duplicate-prompt"');
    expect(html).toContain("https://example.com/manage/abc");
    expect(html).toContain("Continue anyway");
  });
});
