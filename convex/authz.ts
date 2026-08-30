import type { Auth } from "convex/server";

type Identity = {
  email?: string;
  subject: string;
};

type AuthContext = { auth: Auth };

export function assertOperatorIdentity(
  identity: Identity | null,
  operatorEmail: string | undefined,
): Identity {
  if (!operatorEmail) {
    throw new Error("Server configuration error: OPERATOR_EMAIL is missing");
  }

  if (!identity) {
    throw new Error("Authentication required");
  }

  if (identity.email?.trim().toLowerCase() !== operatorEmail.trim().toLowerCase()) {
    throw new Error("Operator access required");
  }

  return identity;
}

export async function requireOperator(ctx: AuthContext): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  return assertOperatorIdentity(identity, process.env.OPERATOR_EMAIL);
}
