import React from "react";

export function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(90deg, #171717 25%, #2A2A2A 50%, #171717 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear",
        borderRadius: "var(--radius-xs)",
        ...style
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card" style={{ padding: "24px", borderRadius: "var(--radius-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <SkeletonPulse style={{ width: "40%", height: "16px" }} />
        <SkeletonPulse style={{ width: "24px", height: "24px", borderRadius: "var(--radius-xs)" }} />
      </div>
      <SkeletonPulse style={{ width: "60%", height: "32px", marginBottom: "8px" }} />
      <SkeletonPulse style={{ width: "80%", height: "12px" }} />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
      <td style={{ padding: "20px 0" }}>
        <SkeletonPulse style={{ width: "50%", height: "16px", marginBottom: "8px" }} />
        <SkeletonPulse style={{ width: "30%", height: "12px" }} />
      </td>
      <td>
        <SkeletonPulse style={{ width: "80px", height: "24px", borderRadius: "var(--radius-pill)" }} />
      </td>
      <td>
        <SkeletonPulse style={{ width: "60px", height: "16px" }} />
      </td>
      <td>
        <div style={{ display: "flex", gap: "8px" }}>
          <SkeletonPulse style={{ width: "16px", height: "16px" }} />
          <SkeletonPulse style={{ width: "16px", height: "16px" }} />
        </div>
      </td>
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "30px" }}>
      <div className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
        <SkeletonPulse style={{ width: "150px", height: "24px", marginBottom: "24px" }} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </tbody>
        </table>
      </div>
      <div className="glass-card" style={{ padding: "28px", borderRadius: "var(--radius-lg)", height: "300px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <SkeletonPulse style={{ width: "24px", height: "24px" }} />
          <SkeletonPulse style={{ width: "120px", height: "20px" }} />
        </div>
        <SkeletonPulse style={{ width: "90%", height: "14px", marginBottom: "24px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <SkeletonPulse style={{ height: "60px", borderRadius: "var(--radius-sm)" }} />
          <SkeletonPulse style={{ height: "60px", borderRadius: "var(--radius-sm)" }} />
        </div>
      </div>
    </div>
  );
}
