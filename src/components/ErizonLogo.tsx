import Image from "next/image";

interface ErizonLogoProps {
  size?: number;
  className?: string;
}

export default function ErizonLogo({ size = 28, className = "" }: ErizonLogoProps) {
  return (
    <div
      className={`shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_14px_rgba(168,85,247,0.2)] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-erizon.png"
        alt="Erizon"
        width={size}
        height={size}
        className="w-full h-full object-cover"
        priority
      />
    </div>
  );
}
