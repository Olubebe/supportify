import type { UserIdentity } from "convex/server";

export const getAuthOrganizationId = (identity: UserIdentity) => {
  return (identity.orgId ?? identity.org_id) as string | undefined;
};
