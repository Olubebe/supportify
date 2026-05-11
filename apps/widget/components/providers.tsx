"use client"

import * as React from "react"
import { Provider } from "jotai";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return (
      <Provider>
        <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
          Missing NEXT_PUBLIC_CONVEX_URL.
        </div>
      </Provider>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <Provider>
        {children}
      </Provider>
    </ConvexProvider>
  );
};
