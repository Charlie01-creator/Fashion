"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion } from "framer-motion";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, disabled, className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brass-500 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-ink text-bone hover:bg-brass-600",
      secondary: "bg-white text-ink border border-stone hover:border-ink/40",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={`${base} ${variants[variant]} ${className}`}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading ? "Please wait…" : children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
