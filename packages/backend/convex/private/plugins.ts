import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { getAuthOrganizationId } from "../lib/auth";
import { internal } from "../_generated/api";
import { deleteSecret, getAwsErrorName } from "../lib/secrets";

export const remove = action({
  args: {
    service: v.union(v.literal("vapi"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = getAuthOrganizationId(identity);

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const existingPlugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      {
        organizationId: orgId,
        service: args.service,
      },
    );

    if (!existingPlugin) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Plugin not found"
      });
    }

    try {
      await deleteSecret(existingPlugin.secretName);
    } catch (error) {
      if (getAwsErrorName(error) === "AccessDeniedException") {
        throw new ConvexError({
          code: "AWS_ACCESS_DENIED",
          message:
            "AWS Secrets Manager denied access. The configured IAM user needs DeleteSecret permission for tenant secrets.",
        });
      }

      throw error;
    }

    await ctx.runMutation(internal.system.plugins.remove, {
      organizationId: orgId,
      service: args.service,
    });
  },
});

export const getOne = query({
  args: {
    service: v.union(v.literal("vapi"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (identity === null) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Identity not found",
      });
    }

    const orgId = getAuthOrganizationId(identity);

    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    return await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", orgId).eq("service", args.service)
      )
      .unique();
  },
});
