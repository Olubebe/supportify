"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";
import { OrgSelectionView } from "@/modules/auth/ui/views/org-selection-view";
import { useEffect, useState } from "react";

type ConvexOrgClaimState = "loading" | "present" | "missing";

const getJwtPayload = (token: string | null) => {
  if (!token) {
    return null;
  }

  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const OrganizationGuard = ({ children }: { children: React.ReactNode; }) => {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization();
  const [convexOrgClaimState, setConvexOrgClaimState] =
    useState<ConvexOrgClaimState>("loading");

  useEffect(() => {
    let isActive = true;

    const checkConvexOrgClaim = async () => {
      if (!isAuthLoaded || !isOrganizationLoaded) {
        return;
      }

      if (!organization) {
        setConvexOrgClaimState("missing");
        return;
      }

      setConvexOrgClaimState("loading");

      const token = await getToken({ template: "convex" });
      const payload = getJwtPayload(token);
      const tokenOrgId = payload?.org_id ?? payload?.orgId;

      if (isActive) {
        setConvexOrgClaimState(tokenOrgId ? "present" : "missing");
      }
    };

    checkConvexOrgClaim().catch(() => {
      if (isActive) {
        setConvexOrgClaimState("missing");
      }
    });

    return () => {
      isActive = false;
    };
  }, [getToken, isAuthLoaded, isOrganizationLoaded, organization]);

  if (!isAuthLoaded || !isOrganizationLoaded) {
    return (
      <AuthLayout>
        <p>Loading...</p>
      </AuthLayout>
    );
  }

  if (!organization) {
    return (
      <AuthLayout>
        <OrgSelectionView />
      </AuthLayout>
    );
  }

  if (convexOrgClaimState === "loading") {
    return (
      <AuthLayout>
        <p>Loading organization...</p>
      </AuthLayout>
    );
  }

  if (convexOrgClaimState === "missing") {
    return (
      <AuthLayout>
        <div className="max-w-md space-y-2 text-center">
          <h1 className="font-semibold text-lg">Organization unavailable</h1>
          <p className="text-muted-foreground text-sm">
            Your Clerk Convex token is missing the active organization claim.
            Add the organization ID claim to the Clerk JWT template named convex,
            then refresh this page.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <>
      {children}
    </>
  );
};
