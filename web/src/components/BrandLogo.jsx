import React from 'react';

export const BrandLogo = ({ className = "w-40" }) => {
  return (
    <div className={`relative flex items-center ${className} select-none`}>
      <svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm">
        <defs>
          <mask id="textMask">
            <rect width="100%" height="100%" fill="black" />
            <text x="0" y="76" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="900" fontSize="85" letterSpacing="-4" fill="white">
              echo
            </text>
          </mask>
        </defs>

        <g mask="url(#textMask)">
          {/* Base */}
          <rect width="100%" height="100%" fill="var(--color-primary-container)" />
          
          {/* 'e' segments */}
          <path d="M 0 50 Q 30 30 70 70 L 70 100 L 0 100 Z" fill="var(--color-primary)" />
          <path d="M -10 80 Q 30 110 80 70 L 0 100 Z" fill="var(--color-primary)" opacity="0.7"/>
          
          {/* 'c' segments */}
          <circle cx="70" cy="20" r="25" fill="var(--color-tertiary-container)" />
          <path d="M 50 60 Q 90 10 130 70 L 130 100 L 50 100 Z" fill="var(--color-secondary)" />
          
          {/* 'h' segments */}
          <rect x="90" y="0" width="30" height="80" fill="var(--color-tertiary)" />
          <path d="M 100 30 Q 150 20 160 70 L 160 100 L 100 100 Z" fill="var(--color-secondary)" />
          <path d="M 130 10 Q 170 20 170 50 L 170 100 L 120 100 Z" fill="var(--color-on-surface)" opacity="0.9"/>
          
          {/* 'o' segments */}
          <rect x="140" y="0" width="60" height="100" fill="var(--color-on-surface)" />
          <circle cx="165" cy="50" r="45" fill="var(--color-primary-container)" opacity="0.9" />
          <circle cx="175" cy="90" r="35" fill="var(--color-secondary-container)" opacity="0.9" />
          <path d="M 140 50 Q 170 25 220 50 L 220 100 L 140 100 Z" fill="var(--color-primary)" opacity="0.5" />
        </g>

        {/* Concentric rings inside 'o'. 
            At fontSize 85, 'o' center is approximately x=166, y=49 */}
        <g transform="translate(166, 49)" stroke="var(--color-surface)" fill="none">
          <circle cx="0" cy="0" r="14" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="6.5" strokeWidth="2" />
          <circle cx="0" cy="0" r="2" fill="var(--color-surface)" stroke="none" />
        </g>
      </svg>
    </div>
  );
};
