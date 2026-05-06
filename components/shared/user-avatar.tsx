import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  avatarUrl?: string | null
  name?: string | null
  className?: string
  fallbackClassName?: string
  imageClassName?: string
}

function getInitials(name?: string | null) {
  if (!name) {
    return "U"
  }

  return name
    .split(" ")
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join("")
}

export function UserAvatar({
  avatarUrl,
  name,
  className,
  fallbackClassName,
  imageClassName,
}: UserAvatarProps) {
  return (
    <Avatar className={cn("h-full w-full", className)}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={name ? `Avatar de ${name}` : "Avatar de usuario"}
          className={cn("object-cover", imageClassName)}
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-[#1e2d5e] to-[#2d4a8a] text-xs font-semibold text-white",
          fallbackClassName
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
