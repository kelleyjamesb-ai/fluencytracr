import type { ComplianceStatus } from "../../types/governance";

type RagChipProps = {
  status: ComplianceStatus;
  confidence?: number;
};

const STATUS_MAP: Record<ComplianceStatus, { cls: string; label: string }> = {
  enabled:  { cls: "gsd-rag-green",   label: "Aligned" },
  partial:  { cls: "gsd-rag-amber",   label: "Watch" },
  disabled: { cls: "gsd-rag-red",     label: "Blocked" },
  unknown:  { cls: "gsd-rag-unknown", label: "Unknown" }
};

export function RagChip({ status, confidence }: RagChipProps) {
  const { cls, label } = STATUS_MAP[status] ?? STATUS_MAP.unknown;
  return (
    <span className={`gsd-rag ${cls}`}>
      {label}
      {confidence !== undefined && (
        <span style={{ fontWeight: 400, fontSize: "12px" }}>
          {" "}({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
}
