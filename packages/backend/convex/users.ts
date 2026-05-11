import { query, mutation } from "./_generated/server";
import { getAuthOrganizationId } from "./lib/auth";

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return users;
  },
});

export const add = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const orgId = getAuthOrganizationId(identity);

    if (!orgId) {
      throw new Error("Missing organization");
    }

    throw new Error("Tracking test");

    const userId = await ctx.db.insert("users", {
      name: "Antonio",
    });

    return userId;
  },
});
