"use client";

export function StaticFallback() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(135deg, var(--color-spot-rose) 0%, var(--color-spot-amber) 35%, var(--color-spot-mint) 65%, var(--color-spot-violet) 100%)",
        opacity: 0.15,
        mixBlendMode: "multiply",
      }}
    />
  );
}
