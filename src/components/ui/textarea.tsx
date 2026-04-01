import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "border-input placeholder:text-muted-foreground bg-input/35 hover:bg-input/50 focus-visible:bg-input/55 flex field-sizing-content w-full rounded-[var(--radius-control-lg)] border px-4 py-3 text-base shadow-xs transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      size: {
        default: "min-h-28",
        compact: "min-h-20",
        roomy: "min-h-36",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type TextareaProps = React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants>;

function Textarea({ className, size, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ size }), className)}
      spellCheck="false"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
