import { describe, expect, it } from "vitest";

import { authenticatedQueryArgs } from "../../lib/convex/authenticatedQuery";

describe("authenticatedQueryArgs", () => {
  it("skips protected queries until Clerk authentication is ready", () => {
    expect(authenticatedQueryArgs(true, false)).toBe("skip");
    expect(authenticatedQueryArgs(false, false)).toBe("skip");
    expect(authenticatedQueryArgs(false, true)).toEqual({});
  });
});
