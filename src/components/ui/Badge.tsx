import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "glow" | "outline";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    let variantStyles = "";
    switch (variant) {
      case "default":
        variantStyles = "bg-border text-foreground";
        break;
      case "success":
        variantStyles = "bg-success/20 text-success border border-success/30";
        break;
      case "danger":
        variantStyles = "bg-danger/20 text-danger border border-danger/30";
        break;
      case "warning":
        variantStyles = "bg-accent/20 text-accent border border-accent/30";
        break;
      case "glow":
        variantStyles = "bg-accent text-background shadow-[0_0_10px_rgba(201,168,76,0.6)] font-bold";
        break;
      case "outline":
        variantStyles = "bg-transparent text-muted border border-border";
        break;
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantStyles} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
