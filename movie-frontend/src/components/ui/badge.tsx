import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Black-and-white badges. Meaning is shown with fill / border style, not with colour:
 *   success     = filled (finished / online)
 *   warning     = dashed border (in progress)
 *   default     = grey box
 *   outline     = plain border
 *   destructive = red text + border (errors)
 */
const badgeVariants = cva("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-border bg-muted text-foreground",
      outline: "border-border text-muted-foreground",
      success: "border-foreground bg-foreground text-background",
      warning: "border-dashed border-foreground text-foreground",
      destructive: "border-destructive text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
