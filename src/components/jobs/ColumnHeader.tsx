import { cn } from "@/lib/utils";

interface Props {
  label: string;
  count: number;
  revenue?: number;
  accentClass: string;
  isOver?: boolean;
}

export default function ColumnHeader({ label, count, revenue, accentClass, isOver }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card border border-border/60 px-3 py-2.5 transition-all sticky top-0 z-10",
        isOver && "ring-2 ring-primary/40 shadow-md"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("h-2 w-2 rounded-full", accentClass)} />
        <h3 className="font-display text-sm font-semibold tracking-wide uppercase">
          {label}
        </h3>
        <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {revenue != null && revenue > 0 && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          £{revenue.toFixed(0)} potential
        </p>
      )}
    </div>
  );
}
