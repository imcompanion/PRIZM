import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import {
  type Rule,
  type TimeEntryForClassification,
  type MatchResult,
  classifyEntry,
  fetchRulesWithConditions,
  fetchProjectIdSet,
} from "@/lib/billability";

// ── Component ───────────────────────────────────
export const UnmatchedEntriesReport = () => {
  const [filterStatus, setFilterStatus] = useState<"all" | "unmatched" | "billable" | "non-billable">("unmatched");
  const [groupBy, setGroupBy] = useState<"none" | "person" | "project" | "notes">("notes");

  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: fetchRulesWithConditions,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time_entries_for_classification"],
    queryFn: async () => {
      const allEntries: TimeEntryForClassification[] = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("id, date, hours, notes, project_id, person_id, people(name, roles(name)), projects(title, opportunity_record_type, revenue, stage, office)")
          .order("date", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allEntries.push(...(data as unknown as TimeEntryForClassification[]));
        if (data.length < batchSize) break;
        offset += batchSize;
      }
      return allEntries;
    },
  });

  const { data: projectIdsRaw = [] } = useQuery({
    queryKey: ["project_ids_set"],
    queryFn: fetchProjectIdSet,
  });
  const projectIds = useMemo(() => new Set(projectIdsRaw), [projectIdsRaw]);

  const classified = useMemo(() => {
    return entries.map(entry => {
      const projectExists = entry.project_id ? projectIds.has(entry.project_id) : false;
      const { result, matchedRule } = classifyEntry(rules, entry, projectExists);
      return { entry, result, matchedRule };
    });
  }, [entries, rules, projectIds]);

  const stats = useMemo(() => {
    const billable = classified.filter(c => c.result === "billable");
    const nonBillable = classified.filter(c => c.result === "non-billable");
    const unmatched = classified.filter(c => c.result === "unmatched");
    return {
      total: classified.length,
      billable: billable.length,
      billableHours: billable.reduce((s, c) => s + c.entry.hours, 0),
      nonBillable: nonBillable.length,
      nonBillableHours: nonBillable.reduce((s, c) => s + c.entry.hours, 0),
      unmatched: unmatched.length,
      unmatchedHours: unmatched.reduce((s, c) => s + c.entry.hours, 0),
    };
  }, [classified]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return classified;
    return classified.filter(c => c.result === filterStatus);
  }, [classified, filterStatus]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const groups = new Map<string, { entries: typeof filtered; totalHours: number; count: number }>();
    for (const item of filtered) {
      let key: string;
      if (groupBy === "person") key = item.entry.people?.name || "Unknown";
      else if (groupBy === "project") key = item.entry.projects?.title || "(No project)";
      else key = item.entry.notes || "(No task)";
      if (!groups.has(key)) groups.set(key, { entries: [], totalHours: 0, count: 0 });
      const g = groups.get(key)!;
      g.entries.push(item);
      g.totalHours += item.entry.hours;
      g.count += 1;
    }
    return [...groups.entries()]
      .sort((a, b) => b[1].totalHours - a[1].totalHours)
      .map(([key, data]) => ({ key, ...data }));
  }, [filtered, groupBy]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading time entries for classification…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilterStatus("billable")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Billable</span>
            </div>
            <p className="text-2xl font-bold">{stats.billable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.billableHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilterStatus("non-billable")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Non-billable</span>
            </div>
            <p className="text-2xl font-bold">{stats.nonBillable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.nonBillableHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setFilterStatus("unmatched")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Unmatched</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.unmatched.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.unmatchedHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="unmatched">Unmatched</SelectItem>
            <SelectItem value="billable">Billable</SelectItem>
            <SelectItem value="non-billable">Non-billable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="notes">Group by Task</SelectItem>
            <SelectItem value="person">Group by Person</SelectItem>
            <SelectItem value="project">Group by Project</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length.toLocaleString()} entries · {filtered.reduce((s, c) => s + c.entry.hours, 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} hours
        </span>
      </div>

      {/* Grouped view */}
      {grouped ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === "person" ? "Person" : groupBy === "project" ? "Project" : "Task"}</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.slice(0, 100).map(g => (
                  <TableRow key={g.key}>
                    <TableCell className="font-medium">{g.key}</TableCell>
                    <TableCell className="text-right">{g.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{g.totalHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {grouped.length > 100 && (
              <p className="text-xs text-muted-foreground text-center mt-3">Showing top 100 of {grouped.length} groups</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map(({ entry, result, matchedRule }) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                    <TableCell>{entry.people?.name || "—"}</TableCell>
                    <TableCell>{entry.projects?.title || <span className="text-muted-foreground italic">No project</span>}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                    <TableCell className="text-right">{entry.hours}</TableCell>
                    <TableCell>
                      {result === "billable" && <Badge variant="default" className="text-xs">{matchedRule?.name || "Billable"}</Badge>}
                      {result === "non-billable" && <Badge variant="secondary" className="text-xs">{matchedRule?.name || "Non-billable"}</Badge>}
                      {result === "unmatched" && <Badge variant="destructive" className="text-xs">Unmatched</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground text-center mt-3">Showing first 200 of {filtered.length.toLocaleString()} entries</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
