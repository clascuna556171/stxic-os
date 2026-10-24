import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "border-border bg-surface-2/50 text-foreground placeholder:text-muted hover:border-foreground/15 focus-visible:border-accent focus-visible:bg-surface flex h-10 w-full rounded-lg border px-3 text-sm transition-[border-color,background-color] duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
