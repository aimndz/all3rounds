import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StatusFilterTabsProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StatusFilterTabs({ options, value, onChange, className = "" }: StatusFilterTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange} className={`w-fit ${className}`}>
      <TabsList className="bg-[#141417] border border-white/10 rounded-xl p-1 h-auto flex flex-wrap gap-0">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className="rounded-lg px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-black text-white/40 hover:bg-white/5 hover:text-white"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
