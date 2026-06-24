'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-base',
}

const SIZE_PX: Record<keyof typeof SIZE_CLASSES, string> = {
  xs: '24px',
  sm: '32px',
  md: '36px',
  lg: '56px',
}

interface AvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function Avatar({ src, name, size = 'sm', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = SIZE_CLASSES[size]

  // Reset error state whenever src changes so a new URL always tries to load
  useEffect(() => { setImgError(false) }, [src])

  if (src && !imgError) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 bg-primary/10 relative ${className}`}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={SIZE_PX[size]}
          className="object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 ${className}`}
      aria-label={name}
    >
      {getInitials(name || '?')}
    </div>
  )
}
