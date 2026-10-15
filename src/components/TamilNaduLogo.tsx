import React, { useState } from 'react';
import emblemSvg from '../assets/Emblem_of_Tamil_Nadu.svg';

interface TamilNaduLogoProps {
  className?: string;
  size?: number;
}

export const TamilNaduLogo: React.FC<TamilNaduLogoProps> = ({ 
  className = "w-12 h-12", 
  size = 48 
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className={`relative shrink-0 flex items-center justify-center rounded-full bg-white shadow-md border-2 border-amber-600/70 p-0.5 overflow-hidden ${className}`}
      title="Government of Tamil Nadu Official Emblem"
      style={{ width: size, height: size }}
    >
      <img
        src={!imgError ? emblemSvg : '/Emblem_of_Tamil_Nadu.svg'}
        alt="Government of Tamil Nadu Official Emblem"
        className="w-full h-full object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
};
