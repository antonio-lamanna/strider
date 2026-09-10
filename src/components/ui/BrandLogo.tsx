const logo = `${import.meta.env.BASE_URL}strider-logo.svg`;

export function BrandLogo() {
  return (
    <span className="brand-logo" role="img" aria-label="Strider">
      <style>{`
        .brand-logo { display:flex; align-items:center; gap:4px; width:100%; }
        .brand-symbol { display:block; width:23%; height:auto; flex-shrink:0; fill:#e75c2b; }
        .brand-wordmark { display:block; width:calc(77% - 4px); height:auto; fill:var(--text); }
        @media (max-width:1050px) {
          .brand-wordmark { display:none; }
          .brand-symbol { width:36px; }
        }
      `}</style>
      <svg className="brand-symbol" viewBox="0 0 264 192" aria-hidden="true">
        <use href={`${logo}#mark`} width="264" height="192" />
      </svg>
      <svg className="brand-wordmark" viewBox="0 0 860 106" aria-hidden="true">
        <use href={`${logo}#wordmark`} width="860" height="106" />
      </svg>
    </span>
  );
}
