import * as React from "react";
import { postureTokens, type Posture } from "@/lib/visualTokens";
import { cn } from "@/lib/utils";

type PostureChipProps = {
  posture: Posture;
  className?: string;
};

export const PostureChip = ({ posture, className }: PostureChipProps) => {
  const token = postureTokens[posture];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
        token.colorClass,
        className
      )}
      aria-label={`Recommended posture: ${token.label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {token.label}
    </span>
  );
};
