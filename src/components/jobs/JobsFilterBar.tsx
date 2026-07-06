import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import type { Profile } from "@/types/database";

interface Props {
  query: string;
  setQuery: (s: string) => void;
  stylistFilter: string;
  setStylistFilter: (s: string) => void;
  dateFilter: string;
  setDateFilter: (s: string) => void;
  stylists: Profile[];
}

export default function JobsFilterBar({
  query, setQuery, stylistFilter, setStylistFilter, dateFilter, setDateFilter, stylists,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-2.5">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client, preference, or notes…"
          className="pl-8 h-9"
        />
      </div>
      <Select value={stylistFilter} onValueChange={setStylistFilter}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="All stylists" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stylists</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {stylists.map(s => (
            <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This week</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
