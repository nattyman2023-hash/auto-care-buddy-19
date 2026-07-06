import { Sparkles, Check, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Job } from "@/types/database";

interface Props {
  pending: (Job & { customer?: any })[];
  onConfirm: (jobId: string) => void;
  onAssign: (job: Job) => void;
  onOpen: (job: Job) => void;
}

export default function NewRequestsStrip({ pending, onConfirm, onAssign, onOpen }: Props) {
  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-warning" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider">
          New Requests
        </h2>
        <span className="text-xs text-muted-foreground bg-warning/15 px-2 py-0.5 rounded-full">
          {pending.length} need attention
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {pending.map(job => (
          <div
            key={job.id}
            className="shrink-0 w-[260px] rounded-xl bg-card border border-border/60 p-3 hover:shadow-md transition"
          >
            <button
              onClick={() => onOpen(job)}
              className="text-left w-full"
            >
              <p className="font-display font-semibold text-sm truncate">
                {(job.customer as any)?.name ?? "Walk-in"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {job.notes || job.service_type}
              </p>
              {job.scheduled_at && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {format(new Date(job.scheduled_at), "EEE d · HH:mm")}
                </p>
              )}
            </button>
            <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-border/40">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] flex-1"
                onClick={() => onAssign(job)}
              >
                <User className="h-3 w-3 mr-1" /> Assign
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px] flex-1"
                onClick={() => onConfirm(job.id)}
              >
                <Check className="h-3 w-3 mr-1" /> Confirm
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
