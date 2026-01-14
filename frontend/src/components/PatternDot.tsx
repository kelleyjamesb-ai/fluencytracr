import * as React from "react";
import { patternTokens, type PatternName } from "@/lib/visualTokens";
import { cn } from "@/lib/utils";

type PatternDotProps = {
  pattern: PatternName;
  className?: string;
};

export const PatternDot = ({ pattern, className }: PatternDotProps) => {
  const token = patternTokens[pattern];
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", token.dotClass, className)}
      aria-label={`Pattern: ${pattern}`}
      title={pattern}
    />
  );
};
