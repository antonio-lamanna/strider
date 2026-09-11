const logo = `${import.meta.env.BASE_URL}strider-logo.svg`;

export function BrandLogo() {
  return (
    <span className="brand-logo" role="img" aria-label="Strider">
      <svg className="brand-symbol" viewBox="0 0 264 192" aria-hidden="true">
        <use href={`${logo}#mark`} width="264" height="192" />
      </svg>
      <svg className="brand-wordmark" viewBox="0 0 860 106" aria-hidden="true">
        <use href={`${logo}#wordmark`} width="860" height="106" />
      </svg>
    </span>
  );
}
