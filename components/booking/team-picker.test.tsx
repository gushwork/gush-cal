import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TeamPicker } from "./team-picker";

describe("TeamPicker", () => {
  it("renders team options", () => {
    const html = renderToStaticMarkup(
      <TeamPicker
        teams={[
          { id: "t1", name: "Sales", slug: "sales" },
          { id: "t2", name: "Support", slug: "support" },
        ]}
        selectedTeamId="t1"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('data-testid="team-picker"');
    expect(html).toContain("Sales");
    expect(html).toContain("Support");
  });
});
