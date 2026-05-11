import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthOrganizationId } from "../lib/auth";
import { getAwsErrorName, upsertSecret } from "../lib/secrets";
import { VapiClient } from "@vapi-ai/server-sdk";

export const upsert = action({
  args: {
    service: v.union(v.literal("vapi")),
    value: v.object({
      publicApiKey: v.string(),
      privateApiKey: v.string(),
    }),
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

    const publicApiKey = args.value.publicApiKey.trim();
    const privateApiKey = args.value.privateApiKey.trim();

    if (!publicApiKey || !privateApiKey) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Vapi public and private API keys are required",
      });
    }

    const secretName = `tenant/${orgId}/${args.service}`;

    try {
      const vapiClient = new VapiClient({
        token: privateApiKey,
      });

      await vapiClient.assistants.list();
    } catch {
      return {
        ok: false,
        code: "VAPI_AUTH_FAILED",
        message: "Vapi rejected the private API key. Check the key and try again.",
      };
    }

    try {
      await upsertSecret(secretName, {
        publicApiKey,
        privateApiKey,
      });
    } catch (error) {
      if (getAwsErrorName(error) === "AccessDeniedException") {
        return {
          ok: false,
          code: "AWS_ACCESS_DENIED",
          message:
            "AWS Secrets Manager denied access. The configured IAM user needs CreateSecret and PutSecretValue permissions for tenant secrets.",
        };
      }

      throw error;
    }

    await ctx.runMutation(internal.system.plugins.upsert, {
      service: args.service,
      organizationId: orgId,
      secretName,
    });

    return {
      ok: true,
      secretName,
    };
  },
});
