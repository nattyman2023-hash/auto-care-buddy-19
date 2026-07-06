import { Button } from "@/components/ui/button";
import { Plus, Calendar, AlertCircle, Clock, Banknote, Users } from "lucide-react";
import { format } from "date-fns";

interface KPI {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "primary" | "accent" | "warning" | "muted";
  hint?: string;
}

interface Props {
  date?: Date;
  totalBooked: number;
  inChair: number;
  takings: number;
  unassigned: number;
  onNew: () => void;
}

export default function BoardHeader({ date = new Date(), totalBooked, inChair, takings, unassigned, onNew }: Props) {
  const kpis: KPI[] = [
    { label: "Booked today", value: totalBooked, icon: Calendar, tone: "primary" },
    { label: "In chair", value: inChair, icon: Clock, tone: "accent" },
    { label: "Takings", value: `£${takings.toFixed(0)}`, icon: Banknote, tone: "muted" },
    { label: "Unassigned", value: unassigned, icon: AlertCircle, tone: unassigned > 0 ? "warning" : "muted" },
  ];

  const toneClass = (tone: KPI["tone"]) => ({
    primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
    accent: "from-accent/15 to-accent/5 text-accent-foreground border-accent/30",
    warning: "from-warning/20 to-warning/5 text-foreground border-warning/40 animate-pulse",
    muted: "from-muted/40 to-muted/10 text-foreground border-border",
  }[tone]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Today</p>
          <h1 className="text-3xl md:text-4xl font-display tracking-tight">
            {format(date, "EEEE, d MMMM")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live board · drag a card between columns to move clients along the journey
          </p>
        </div>
        <Button onClick={onNew} size="lg" className="shadow-md">
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={`rounded-xl border bg-gradient-to-br ${toneClass(k.tone)} p-4 transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider opacity-80">{k.label}</span>
                <Icon className="h-4 w-4 opacity-70" />
              </div>
              <p className="text-3xl font-display font-semibold mt-2">{k.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
