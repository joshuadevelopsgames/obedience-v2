import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "gradient";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    let variantStyles = "";
    switch (variant) {
      case "primary":
        variantStyles =
          "bg-primary text-on-primary hover:bg-primary-container font-bold";
        break;
      case "gradient":
        variantStyles =
          "btn-gradient font-headline tracking-widest uppercase";
        break;
      case "secondary":
        variantStyles =
          "bg-surface-container text-foreground hover:bg-surface-bright font-medium border border-white/5";
        break;
      case "danger":
        variantStyles =
          "bg-danger/10 text-danger hover:bg-danger hover:text-white font-medium border border-danger/20";
        break;
      case "ghost":
        variantStyles =
          "bg-transparent text-zinc-500 hover:text-foreground hover:bg-white/5 font-medium";
        break;
      case "outline":
        variantStyles =
          "btn-ghost font-medium";
        break;
    }

    let sizeStyles = "";
    switch (size) {
      case "sm":
        sizeStyles = "px-3 py-1.5 text-xs";
        break;
      case "md":
        sizeStyles = "px-4 py-2 text-sm";
        break;
      case "lg":
        sizeStyles = "px-6 py-3 text-base";
        break;
    }

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-sm transition-all disabled:opacity-50 disabled:pointer-events-none focus:outline-none active:scale-95 ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
