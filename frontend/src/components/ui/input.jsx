import * as React from "react";
import { cn } from "@/lib/utils";

// Inset "well": darker than the page, soft radius rather than pill.
const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-10 w-full rounded-well border border-border-strong bg-abyss px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:border-muted-foreground/60 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
