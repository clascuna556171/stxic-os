import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "border-border bg-surface-2/50 text-foreground placeholder:text-muted hover:border-foreground/15 focus-visible:border-accent focus-visible:bg-surface flex min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-sm transition-[border-color,background-color] duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
