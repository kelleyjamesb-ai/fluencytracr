import * as React from "react";
import { cn } from "@/lib/utils";
import { sectionTintClass, type SectionKey } from "@/lib/visualTokens";

export function SectionTint({ section, children }: { section: SectionKey; children: React.ReactNode }) {
  const tint = sectionTintClass[section];
  return (
    <div className={cn("min-h-screen", tint)}>
      <div className="min-h-screen bg-background/80 backdrop-blur-[2px]">
        {children}
      </div>
    </div>
  );
}
