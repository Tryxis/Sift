import { useEffect, useState } from "react";
import { coverTone } from "@/lib/coverTone";
import { cn } from "@/lib/utils";

export function GameCover({ appId, name, src, fallbackSrc, className, shape = "wide" }) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setFailed(false);
  }, [src]);

  const handleImageError = () => {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      return;
    }

    setFailed(true);
  };

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-t-card border-b border-border bg-card",
        shape === "portrait" ? "aspect-[2/3]" : "aspect-[460/215]",
        className
      )}
    >
      {failed || !src ? (
        <div className={cn("absolute inset-0 overflow-hidden bg-gradient-to-br", coverTone(appId))} aria-hidden="true">
          <span className="absolute -bottom-6 right-3 select-none font-display text-[7rem] font-light leading-none text-white/[0.07]">
            {name.slice(0, 1)}
          </span>
        </div>
      ) : (
        <>
          <img
            src={activeSrc}
            alt=""
            loading="lazy"
            onError={handleImageError}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </>
      )}
    </div>
  );
}
