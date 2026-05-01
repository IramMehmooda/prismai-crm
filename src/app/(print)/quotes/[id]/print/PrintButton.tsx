"use client";
export default function PrintButton({ label }: { label: string }) {
  return <button onClick={() => window.print()} style={{ background: "#27ae60", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>{label}</button>;
}
