import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-mono text-[11px] uppercase tracking-wide text-ink/60">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-sm border px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass-500 focus:ring-1 focus:ring-brass-500 ${
            error ? "border-clay" : "border-stone"
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-clay" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
