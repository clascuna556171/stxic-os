import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Form label — sits ABOVE the input (craft rule: never placeholder-as-label). */
const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-foreground mb-1.5 block text-sm font-medium", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
