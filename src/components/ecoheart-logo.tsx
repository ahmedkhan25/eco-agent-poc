'use client';

interface EcoheartLogoProps {
  className?: string;
}

export function EcoheartLogo({ className }: EcoheartLogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Heart shape made of connected nodes - representing smart city network */}
      {/* Light mode: dark gradient, Dark mode: lighter gradient */}
      <path
        d="M24 42L6 24C2 20 2 14 6 10C10 6 16 6 20 10L24 14L28 10C32 6 38 6 42 10C46 14 46 20 42 24L24 42Z"
        className="fill-[url(#heartGradLight)] dark:fill-[url(#heartGradDark)]"
        stroke="#14B8A6"
        strokeWidth="1.5"
      />
      
      {/* Network nodes - teal color works on both themes */}
      <circle cx="12" cy="16" r="2" fill="#14B8A6" />
      <circle cx="24" cy="20" r="2.5" fill="#14B8A6" />
      <circle cx="36" cy="16" r="2" fill="#14B8A6" />
      <circle cx="18" cy="26" r="1.5" fill="#14B8A6" />
      <circle cx="30" cy="26" r="1.5" fill="#14B8A6" />
      <circle cx="24" cy="32" r="2" fill="#14B8A6" />
      
      {/* Connection lines */}
      <path
        d="M12 16L24 20L36 16M18 26L24 20L30 26M24 20V32M18 26L24 32L30 26"
        stroke="#14B8A6"
        strokeWidth="1"
        opacity="0.6"
      />
      
      <defs>
        {/* Light mode gradient - dark fill for contrast on cream background */}
        <linearGradient id="heartGradLight" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A5F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        
        {/* Dark mode gradient - lighter fill for visibility on dark background */}
        <linearGradient id="heartGradDark" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#1E293B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

