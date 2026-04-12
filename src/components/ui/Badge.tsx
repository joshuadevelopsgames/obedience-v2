import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "glow" | "outline" | "accent" | "pink";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    let variantStyles = "";
    switch (variant) {
      case "default":
        variantStyles = "bg-border/60 text-foreground border border-border";
        break;
      case "success":
        variantStyles = "bg-success/10 text-success border border-success/20";
        break;
      case "danger":
        variantStyles = "bg-danger/10 text-danger border border-danger/20";
        break;
      case "warning":
        variantStyles = "bg-warning/10 text-warning border border-warning/20";
        break;
      case "accent":
        variantStyles = "bg-accent/10 text-accent border border-accent/20";
        break;
      case "pink":
        variantStyles = "bg-pink/10 text-pink border border-pink/20";
        break;
      case "glow":
        variantStyles = "bg-accent text-white shadow-[0_0_12px_rgba(155,109,255,0.5)] font-bold";
        break;
      case "outline":
        variantStyles = "bg-transparent text-muted border border-border";
        break;
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-tech tracking-wider transition-colors ${variantStyles} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
