import Image from "next/image";

export function BrandLogo({
  className = "h-12 w-12 sm:h-14 sm:w-14",
  sizes = "(min-width: 640px) 56px, 48px",
  priority = false,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return <Image
    src="/brand/tricehsk-mascot.png"
    alt=""
    width={56}
    height={56}
    sizes={sizes}
    priority={priority}
    className={`shrink-0 object-contain ${className}`}
  />;
}
