import type { ReactNode } from "react";

type HomeSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function HomeSection({
  title,
  description,
  children,
  className,
}: HomeSectionProps) {
  return (
    <section className={className}>
      <div className="mb-8 max-w-5xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground max-w-xl text-sm leading-7 sm:text-base">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}
