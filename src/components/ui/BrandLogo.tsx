const logo = `${import.meta.env.BASE_URL}strider-logo.svg`;

export function BrandLogo() {
  return (
    <span
      className="brand-logo"
      role="img"
      aria-label="Strider"
      style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}
    >
      <svg
        className="brand-symbol"
        viewBox="0 0 264 192"
        aria-hidden="true"
        style={{ display: "block", width: "23%", height: "auto", flexShrink: 0, fill: "var(--brand-accent, #e75c2b)" }}
      >
        <use href={`${logo}#mark`} width="264" height="192" />
      </svg>
      <svg
        className="brand-wordmark"
        viewBox="0 0 860 106"
        aria-hidden="true"
        style={{ display: "block", width: "calc(77% - 4px)", height: "auto", fill: "var(--brand-ink, #222629)" }}
      >
        <use href={`${logo}#wordmark`} width="860" height="106" />
      </svg>
    </span>
  );
}
