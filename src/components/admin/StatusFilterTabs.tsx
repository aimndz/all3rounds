import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface StatusFilterTabsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StatusFilterTabs({
  options,
  value,
  onChange,
  className = "",
}: StatusFilterTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={onChange}
      className={cn("w-full md:w-fit", className)}
    >
      <TabsList size="lg" className="h-auto w-full flex-wrap md:w-fit">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            size="lg"
            className="min-w-fit px-4 text-[10px] tracking-[0.18em] uppercase"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
