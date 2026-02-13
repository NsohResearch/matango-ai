/**
 * MatangoLogo — SVG-based brand mark with loop icon + wordmark.
 */

interface MatangoLogoProps {
  iconOnly?: boolean;
  size?: number;
  className?: string;
}

export function MatangoLogo({ iconOnly = false, size = 32, className = "" }: MatangoLogoProps) {
  if (iconOnly) {
    return (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        width={size} height={size} className={className} aria-label="Matango logo">
        <path d="M32 8C18.745 8 8 18.745 8 32s10.745 24 24 24 24-10.745 24-24"
          stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-primary" />
        <path d="M56 32c0-4.418-1.194-8.56-3.28-12.12"
          stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-accent" />
        <circle cx="32" cy="32" r="6" fill="currentColor" className="text-primary" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-0 ${className}`} aria-label="Matango.ai">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
        width={size} height={size}>
        <path d="M32 8C18.745 8 8 18.745 8 32s10.745 24 24 24 24-10.745 24-24"
          stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-primary" />
        <path d="M56 32c0-4.418-1.194-8.56-3.28-12.12"
          stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-accent" />
        <circle cx="32" cy="32" r="6" fill="currentColor" className="text-primary" />
      </svg>
      <span className="ml-1.5 font-bold tracking-tight" style={{ fontSize: size * 0.6 }}>
        <span className="text-primary">matango</span>
        <span className="text-foreground">.ai</span>
      </span>
    </div>
  );
}

export default MatangoLogo;
