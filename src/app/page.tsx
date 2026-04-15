export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-end justify-end p-8 md:p-16">
      <h1
        className="max-w-[18ch] text-right font-display text-ink italic leading-[0.88]"
        style={{
          fontSize: "clamp(3rem, 11vw, 10rem)",
          letterSpacing: "-0.04em",
        }}
      >
        Portfolio <span className="not-italic">/</span> Manuel Heller — booting…
      </h1>
    </main>
  );
}
