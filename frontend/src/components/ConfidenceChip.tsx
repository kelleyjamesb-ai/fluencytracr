import * as React from "react";
import { cn } from "@/lib/utils";
import { confidenceTokens, type Confidence } from "@/lib/visualTokens";

type ConfidenceChipProps = {
  confidence: Confidence;
  className?: string;
};

export const ConfidenceChip = ({ confidence, className }: ConfidenceChipProps) => {
  const token = confidenceTokens[confidence];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 bg-background/60 backdrop-blur",
        token.className,
        className
      )}
      aria-label={token.label}
      title={token.label}
    >
      {confidence}
    </span>
  );
};
