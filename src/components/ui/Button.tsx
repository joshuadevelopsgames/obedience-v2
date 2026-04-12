import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
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
          "bg-accent text-background hover:bg-accent-hover font-semibold shadow-md shadow-accent/20";
        break;
      case "secondary":
        variantStyles =
          "bg-card text-foreground hover:bg-card-hover hover:text-accent font-medium";
        break;
      case "danger":
        variantStyles =
          "bg-danger/10 text-danger hover:bg-danger hover:text-white font-medium border border-danger/20";
        break;
      case "ghost":
        variantStyles =
          "bg-transparent text-muted hover:text-foreground font-medium";
        break;
      case "outline":
        variantStyles =
          "bg-transparent border border-border text-foreground hover:border-accent hover:text-accent font-medium";
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
        className={`inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-accent/50 ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
