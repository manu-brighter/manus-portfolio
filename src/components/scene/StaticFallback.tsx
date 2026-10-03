"use client";

export function StaticFallback() {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-0 h-lvh w-full"
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
