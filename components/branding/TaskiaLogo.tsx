import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TaskiaLogoProps {
  className?: string
  imageClassName?: string
  href?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function TaskiaLogo({
  className,
  imageClassName,
  href = '/',
  size = 'md',
  showText = false,
}: TaskiaLogoProps) {
  const sizes = {
    sm: {
      wrapper: 'h-8',
      image: 'h-8 w-auto',
      text: 'text-lg',
    },
    md: {
      wrapper: 'h-10',
      image: 'h-10 w-auto',
      text: 'text-xl',
    },
    lg: {
      wrapper: 'h-14',
      image: 'h-14 w-auto',
      text: 'text-2xl',
    },
  }

  const content = (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('relative', sizes[size].wrapper)}>
        <Image
          src="/logo-taskia.png"
          alt="TaskIA"
          width={220}
          height={80}
          priority
          className={cn('w-auto object-contain', sizes[size].image, imageClassName)}
        />
      </div>

      {showText && (
        <span className={cn('font-semibold text-[#1D2155]', sizes[size].text)}>
          TaskIA
        </span>
      )}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} aria-label="Ir a inicio">
      {content}
    </Link>
  )
}