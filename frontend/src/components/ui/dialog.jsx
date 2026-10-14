import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

/** Centred panel on larger screens; a bottom sheet on phones. */
const DialogContent = React.forwardRef(({ className, children, hideClose = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-background/75 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-[95] flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border-strong bg-card shadow-[0_20px_70px_hsl(220_33%_2%/0.8)] focus:outline-none",
        "inset-x-0 bottom-0 rounded-t-card pb-[env(safe-area-inset-bottom,0px)]",
        // Centred with margins rather than translate, which would fight the enter animation.
        "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:max-w-2xl sm:rounded-card sm:pb-0",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=open]:slide-in-from-bottom-8 sm:data-[state=open]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-muted-foreground backdrop-blur hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription };
