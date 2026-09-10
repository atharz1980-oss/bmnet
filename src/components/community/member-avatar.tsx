"use client";
/**
 * أفاتار العضو — صورة من community-media أو initials عربية عند الغياب.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MemberAvatar({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const initials = (name || "؟").trim().slice(0, 2);
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={`صورة ${name}`} /> : null}
      <AvatarFallback aria-hidden="true" className="bg-brand-100 text-brand-800 font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
