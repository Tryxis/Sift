import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        // Inverted white-on-dark: the primary call to action.
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline: "border border-border-strong bg-transparent text-foreground hover:border-muted-foreground/60",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        dashed: "border border-dashed border-border-strong text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-[13px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
