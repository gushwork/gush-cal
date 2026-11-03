import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareInvite } from "./invite-links";

describe("prepareInvite", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("appends reschedule/cancel links for the generated token (auto_inject)", () => {
    vi.stubEnv("AUTH_URL", "https://cal.example.com");
    const invite = prepareInvite("Looking forward to it.", "auto_inject");

    expect(invite.token).toMatch(/^[\w-]{43}$/);
    expect(invite.links.rescheduleUrl).toBe(
      `https://cal.example.com/manage/${invite.token}/reschedule`,
    );
    expect(invite.description).toBe(
      [
        "Looking forward to it.",
        "",
        "Need to make a change?",
        `Reschedule: https://cal.example.com/manage/${invite.token}/reschedule`,
        `Cancel: https://cal.example.com/manage/${invite.token}/cancel`,
      ].join("\n"),
    );
  });

  it("uses only the footer when the Meeting body is empty", () => {
    const invite = prepareInvite("   ", "auto_inject");
    expect(invite.description.startsWith("Need to make a change?")).toBe(true);
  });

  it("only renders placeholders the Scheduler placed (template_opt_in)", () => {
    const plain = prepareInvite("See you then.", "template_opt_in");
    expect(plain.description).toBe("See you then.");

    const placed = prepareInvite("Can't make it? {{cancelUrl}}", "template_opt_in");
    expect(placed.description).toBe(`Can't make it? ${placed.links.cancelUrl}`);
  });

  it("issues a fresh token per invite", () => {
    expect(prepareInvite("", "auto_inject").token).not.toBe(
      prepareInvite("", "auto_inject").token,
    );
  });
});
