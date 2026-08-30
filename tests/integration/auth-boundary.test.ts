import { beforeEach, describe, expect, it } from "vitest";

import { assertOperatorIdentity } from "@/convex/authz";
import { assertSourceEvidence, createEvidenceBacked, list } from "@/convex/candidates";
import { assertCandidateStatus } from "@/convex/validation";

const unauthenticatedContext = {
  auth: { getUserIdentity: async () => null },
};

type ConvexHandler = (context: never, args: never) => Promise<unknown>;

function handlerOf(operation: unknown): ConvexHandler {
  return (operation as { _handler: ConvexHandler })._handler;
}

describe("private application boundaries", () => {
  beforeEach(() => {
    process.env.OPERATOR_EMAIL = "operator@example.com";
  });

  it("rejects an unauthenticated request", () => {
    expect(() => assertOperatorIdentity(null, "operator@example.com")).toThrow(
      "Authentication required",
    );
  });

  it("rejects unauthenticated public queries and mutations before database access", async () => {
    await expect(handlerOf(list)(unauthenticatedContext as never, {} as never)).rejects.toThrow(
      "Authentication required",
    );
    await expect(
      handlerOf(createEvidenceBacked)(unauthenticatedContext as never, {
        title: "Robotics meetup",
        format: "in_person",
        source: {
          url: "https://example.com/event",
          label: "Official event page",
          excerpt: "A sourced event description",
          collectedAt: 1,
          isOfficial: true,
        },
      } as never),
    ).rejects.toThrow("Authentication required");
  });

  it("allows the configured operator to load an empty candidate workspace", async () => {
    const context = {
      auth: {
        getUserIdentity: async () => ({
          email: "operator@example.com",
          subject: "user_1",
        }),
      },
      db: {
        query: () => ({ take: async () => [] }),
      },
    };

    await expect(handlerOf(list)(context as never, {} as never)).resolves.toEqual([]);
  });

  it("rejects an authenticated user outside the allowlist", () => {
    expect(() =>
      assertOperatorIdentity(
        { email: "someone-else@example.com", subject: "user_2" },
        "operator@example.com",
      ),
    ).toThrow("Operator access required");
  });

  it("accepts the configured operator regardless of email casing", () => {
    expect(
      assertOperatorIdentity(
        { email: "Operator@Example.com", subject: "user_1" },
        "operator@example.com",
      ),
    ).toMatchObject({ subject: "user_1" });
  });

  it("fails closed when the operator allowlist is missing", () => {
    expect(() =>
      assertOperatorIdentity(
        { email: "operator@example.com", subject: "user_1" },
        undefined,
      ),
    ).toThrow("OPERATOR_EMAIL is missing");
  });

  it("rejects an invalid candidate lifecycle status", () => {
    expect(() => assertCandidateStatus("published")).toThrow(
      "Invalid candidate status",
    );
  });

  it("rejects candidate evidence with an empty required field", () => {
    expect(() =>
      assertSourceEvidence({
        url: "https://example.com/event",
        label: "Official event page",
        excerpt: "  ",
      }),
    ).toThrow("Source excerpt is required");
  });

  it("rejects candidate evidence without an HTTP source URL", () => {
    expect(() =>
      assertSourceEvidence({
        url: "not-a-url",
        label: "Event listing",
        excerpt: "A sourced event description",
      }),
    ).toThrow("Source URL must use HTTP or HTTPS");
  });
});
