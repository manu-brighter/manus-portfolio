// TS 6 enforces type declarations for side-effect imports. The
// @fontsource-variable/* packages ship CSS only (no .d.ts), so we
// declare them as ambient empty modules here. The runtime effect is
// the CSS-import side-effect; nothing is consumed from these modules.
declare module "@fontsource-variable/inter";
declare module "@fontsource-variable/jetbrains-mono";

// Font files imported as Turbopack `asset` modules resolve to their
// emitted URL (see src/lib/criticalFonts.ts).
declare module "*.woff2" {
  const url: string;
  export default url;
}
