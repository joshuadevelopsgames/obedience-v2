"use client";

import type { Profile } from "@/types/database";

interface UserAvatarProps {
  profile: Profile | null;
  /** Tailwind classes for the outer element (controls size, shape, border) */
  className?: string;
  /** Tailwind classes applied only to the fallback initial div */
  fallbackClassName?: string;
}

/**
 * Displays the user's avatar photo if one exists, otherwise renders a styled
 * initial-letter fallback with the same className applied.
 */
export function UserAvatar({ profile, className = "", fallbackClassName = "" }: UserAvatarProps) {
  const initial = ((profile?.display_name || profile?.collar_name || "?")[0] ?? "?").toUpperCase();

  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.display_name || profile.collar_name || "User"}
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center font-headline font-bold select-none`}>
      {initial}
    </div>
  );
}
