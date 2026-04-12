import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "warning" | "glow" | "outline" | "primary" | "secondary";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    let variantStyles = "";
    switch (variant) {
      case "default":
        variantStyles = "bg-surface-highest text-foreground";
        break;
      case "success":
        variantStyles = "bg-[#00ff9d]/5 text-[#00ff9d] border border-[#00ff9d]/20";
        break;
      case "danger":
        variantStyles = "bg-[#ff3366]/5 text-[#ff3366] border border-[#ff3366]/20";
        break;
      case "warning":
        variantStyles = "bg-warning/5 text-warning border border-warning/20";
        break;
      case "primary":
        variantStyles = "bg-primary/10 text-primary border border-primary/20";
        break;
      case "secondary":
        variantStyles = "bg-pink/10 text-pink border border-pink/20";
        break;
      case "glow":
        variantStyles = "bg-primary text-on-primary neon-glow-primary font-bold";
        break;
      case "outline":
        variantStyles = "bg-transparent text-zinc-400 border border-zinc-400/20";
        break;
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded px-2.5 py-0.5 text-[10px] font-headline font-bold tracking-[0.2em] uppercase transition-colors ${variantStyles} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
