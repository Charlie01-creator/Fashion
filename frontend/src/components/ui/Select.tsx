import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className = "", ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="font-mono text-[11px] uppercase tracking-wide text-ink/60">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`rounded-sm border bg-white px-3.5 py-2.5 text-sm capitalize outline-none transition-colors focus:border-brass-500 focus:ring-1 focus:ring-brass-500 ${
            error ? "border-clay" : "border-stone"
          } ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="capitalize">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-clay" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
