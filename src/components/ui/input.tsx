import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input bg-input/35 hover:bg-input/50 focus-visible:bg-input/55 w-full min-w-0 rounded-[var(--radius-control)] border px-3 text-base shadow-xs transition-[background-color,border-color,color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      size: {
        sm: "h-9",
        default: "h-10",
        lg: "h-11",
        xl: "h-14 text-base",
      },
      variant: {
        default: "",
        subtle: "bg-transparent hover:bg-muted/30 focus-visible:bg-muted/40",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, type, variant, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          inputVariants({ size, variant }),
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input, inputVariants };
