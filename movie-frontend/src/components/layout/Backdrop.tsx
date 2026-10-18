/** Fixed animated background: neon glows + scrolling grid. Purely decorative. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 size-[34rem] animate-pulse-glow rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 size-[30rem] animate-pulse-glow rounded-full bg-accent/15 blur-[120px] [animation-delay:1.2s]" />
      <div className="absolute -bottom-48 left-1/3 size-[30rem] animate-pulse-glow rounded-full bg-secondary/15 blur-[120px] [animation-delay:2.1s]" />
      <div className="grid-bg absolute inset-0 animate-grid-pan" />
    </div>
  );
}
