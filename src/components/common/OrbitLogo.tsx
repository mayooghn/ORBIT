import React from 'react';

interface OrbitLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show the wordmark text */
  showWordmark?: boolean;
  /** Context determines color scheme: 'dark' = orange icon on dark bg, 'light' = orange icon on light bg */
  variant?: 'dark' | 'light';
  /** Additional className for the wrapper */
  className?: string;
}

const sizeMap = {
  sm: { box: 'w-7 h-7', ring: 'w-3.5 h-3.5', dot: 'h-1 w-1', border: 'border-[1.5px]', text: 'text-base' },
  md: { box: 'w-8 h-8', ring: 'w-4 h-4', dot: 'h-1.5 w-1.5', border: 'border-2', text: 'text-lg' },
  lg: { box: 'w-10 h-10', ring: 'w-5 h-5', dot: 'h-1.5 w-1.5', border: 'border-2', text: 'text-xl' },
} as const;

export const OrbitLogo: React.FC<OrbitLogoProps> = ({
  size = 'md',
  showWordmark = true,
  variant = 'dark',
  className = '',
}) => {
  const s = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${s.box} bg-[#f97316] rounded-lg flex items-center justify-center flex-shrink-0`}
        aria-hidden="true"
      >
        <div className={`${s.ring} ${s.border} border-white rounded-full flex items-center justify-center`}>
          <div className={`${s.dot} rounded-full bg-white`} />
        </div>
      </div>
      {showWordmark && (
        <span className={`${s.text} font-bold tracking-tight ${
          variant === 'dark' ? 'text-[#EDEDED]' : 'text-[#0b0b0d]'
        }`}>
          ORBIT
        </span>
      )}
    </div>
  );
};
