export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-symbol" aria-hidden="true">N<span>.</span></span>
      <span>NewsFoundry<span className="brand-dot">.</span></span>
    </span>
  );
}
