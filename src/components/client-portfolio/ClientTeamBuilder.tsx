import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, Plus, X, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, endOfMonth, isBefore, isAfter } from "date-fns";

export interface RoleDemand {
  roleId: string;
  roleName: string;
  team: string;
  monthlyPct: Record<string, number>;
}

interface Props {
  clientName: string;
  roleDemands: RoleDemand[];
  months: string[];
  clientOffice?: string; // "all" or specific office
}

// ── Helpers ──

function normalizeOffice(office: string | null | undefined): string {
  if (!office) return "UK";
  const lower = office.toLowerCase().trim();
  if (lower === "us" || lower === "united states") return "US";
  if (lower === "uk" || lower === "united kingdom") return "UK";
  return office;
}

function isEmployedDuring(
  person: { overall_start_date?: string | null; overall_end_date?: string | null; employment_start_date?: string | null; employment_end_date?: string | null },
  months: string[]
): { employed: boolean; partialMonths: string[] } {
  if (months.length === 0) return { employed: false, partialMonths: [] };

  const startDate = person.overall_start_date || person.employment_start_date;
  const endDate = person.overall_end_date || person.employment_end_date;

  const firstMonth = parseISO(`${months[0]}-01`);
  const lastMonthEnd = endOfMonth(parseISO(`${months[months.length - 1]}-01`));

  // If end date is before the period starts, they're former
  if (endDate && isBefore(parseISO(endDate), firstMonth)) {
    return { employed: false, partialMonths: [] };
  }

  // Check each month for partial coverage
  const partialMonths: string[] = [];
  for (const m of months) {
    const monthStart = parseISO(`${m}-01`);
    const monthEnd = endOfMonth(monthStart);

    if (startDate && isAfter(parseISO(startDate), monthEnd)) {
      partialMonths.push(m); // hasn't started yet
    } else if (endDate && isBefore(parseISO(endDate), monthStart)) {
      partialMonths.push(m); // already left
    }
  }

  return { employed: true, partialMonths };
}

function computePrioritySlots(monthlyPct: Record<string, number>, months: string[]): Array<Record<string, number>> {
  const maxPct = Math.max(0, ...months.map(m => monthlyPct[m] || 0));
  const slotCount = Math.ceil(maxPct / 100);
  if (slotCount === 0) return [];

  const slots: Array<Record<string, number>> = [];
  for (let i = 0; i < slotCount; i++) {
    const slot: Record<string, number> = {};
    for (const m of months) {
      const demand = monthlyPct[m] || 0;
      const alreadyCovered = i * 100;
      const remaining = demand - alreadyCovered;
      slot[m] = Math.max(0, Math.min(100, remaining));
    }
    slots.push(slot);
  }
  return slots;
}

function getSlotAvgPct(slot: Record<string, number>, months: string[]): number {
  if (months.length === 0) return 0;
  const total = months.reduce((s, m) => s + (slot[m] || 0), 0);
  return Math.round(total / months.length);
}

function getSlotLabel(index: number, avgPct: number, months: string[], slot: Record<string, number>): string {
  const allSame = months.every(m => (slot[m] || 0) === (slot[months[0]] || 0));
  const maxPct = Math.max(...months.map(m => slot[m] || 0));
  const minPct = Math.min(...months.map(m => slot[m] || 0));

  if (allSame && maxPct === 100) return `Option ${index + 1} — Full time`;
  if (allSame) return `Option ${index + 1} — ${maxPct}% all months`;
  if (minPct === 0) {
    const activeMonths = months.filter(m => (slot[m] || 0) > 0);
    if (activeMonths.length <= 2) {
      return `Option ${index + 1} — ${activeMonths.map(m => format(parseISO(`${m}-01`), "MMM")).join(", ")} only`;
    }
  }
  return `Option ${index + 1} — avg ${avgPct}%`;
}

// ── Main Component ──

export function ClientTeamBuilder({ clientName, roleDemands, months, clientOffice }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch full people data including dates and role
  const { data: allPeople = [] } = useQuery({
    queryKey: ["people_for_teams_full"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, role_id, team, office, status, overall_start_date, overall_end_date, employment_start_date, employment_end_date")
          .order("name")
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  // Fetch roles for name lookup
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const roleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles) map[r.id] = r.name;
    return map;
  }, [roles]);

  // Group people by normalized name to handle role changes
  const personRecordsByName = useMemo(() => {
    const groups: Record<string, typeof allPeople> = {};
    for (const p of allPeople) {
      const key = p.name.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [allPeople]);

  // For a given person name, find which record is active during the relevant months
  // Returns the active record(s) that overlap with the month range
  const getActiveRecordForMonths = useMemo(() => {
    return (personName: string, targetMonths: string[]): (typeof allPeople)[0] | null => {
      const key = personName.trim().toLowerCase();
      const records = personRecordsByName[key];
      if (!records || records.length === 0) return null;
      if (records.length === 1) return records[0];

      if (targetMonths.length === 0) return records[0];

      // Find the record whose employment period overlaps with the target months
      // Use employment_start_date/employment_end_date for the specific stint, not overall dates
      const firstMonthStart = parseISO(`${targetMonths[0]}-01`);
      const lastMonthEnd = endOfMonth(parseISO(`${targetMonths[targetMonths.length - 1]}-01`));

      // Sort by employment_start_date descending (most recent stint first)
      const sorted = [...records].sort((a, b) => {
        const aStart = a.employment_start_date || a.overall_start_date || "1900-01-01";
        const bStart = b.employment_start_date || b.overall_start_date || "1900-01-01";
        return bStart.localeCompare(aStart);
      });

      // Find the record whose employment stint overlaps with the target period
      for (const rec of sorted) {
        const empStart = rec.employment_start_date ? parseISO(rec.employment_start_date) : null;
        const empEnd = rec.employment_end_date ? parseISO(rec.employment_end_date) : null;

        // Record overlaps if: empStart <= lastMonthEnd AND (no empEnd OR empEnd >= firstMonthStart)
        const startsBeforeEnd = !empStart || !isAfter(empStart, lastMonthEnd);
        const endsAfterStart = !empEnd || !isBefore(empEnd, firstMonthStart);

        if (startsBeforeEnd && endsAfterStart) {
          return rec;
        }
      }

      return sorted[0]; // fallback to most recent
    };
  }, [personRecordsByName]);

  const { data: allAllocations = [] } = useQuery({
    queryKey: ["client_team_allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_team_allocations")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const clientAllocations = useMemo(
    () => allAllocations.filter((a: any) => a.client_name === clientName),
    [allAllocations, clientName]
  );

  const personPrimaryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of allAllocations) {
      if (a.priority === 1) {
        counts[a.person_id] = (counts[a.person_id] || 0) + 1;
      }
    }
    return counts;
  }, [allAllocations]);

  const getPersonOtherClients = (personId: string) => {
    return allAllocations
      .filter(a => a.person_id === personId && a.client_name !== clientName)
      .map(a => a.client_name)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  };

  const addAllocation = useMutation({
    mutationFn: async ({ personId, roleId, priority }: { personId: string; roleId: string; priority: number }) => {
      const { error } = await supabase.from("client_team_allocations").insert({
        client_name: clientName,
        person_id: personId,
        role_id: roleId,
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_team_allocations"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeAllocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_team_allocations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_team_allocations"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const demandsByTeam = useMemo(() => {
    const groups: Record<string, RoleDemand[]> = {};
    for (const d of roleDemands) {
      const team = d.team || "Other";
      if (!groups[team]) groups[team] = [];
      groups[team].push(d);
    }
    return Object.entries(groups)
      .sort(([, a], [, b]) => {
        const aMax = Math.max(...a.map(d => Math.max(...Object.values(d.monthlyPct))));
        const bMax = Math.max(...b.map(d => Math.max(...Object.values(d.monthlyPct))));
        return bMax - aMax;
      });
  }, [roleDemands]);

  function getRoleAllocations(roleId: string) {
    return clientAllocations
      .filter((a: any) => a.role_id === roleId)
      .sort((a: any, b: any) => a.priority - b.priority);
  }

  function getEligiblePeople(roleId: string, priority: number): Array<{
    person: (typeof allPeople)[0];
    warnings: string[];
    officeMatch: boolean;
  }> {
    const alreadyAllocated = new Set(
      clientAllocations.filter((a: any) => a.role_id === roleId).map((a: any) => a.person_id)
    );

    // De-duplicate by person name — only consider the active record
    const seenNames = new Set<string>();
    const results: Array<{
      person: (typeof allPeople)[0];
      warnings: string[];
      officeMatch: boolean;
    }> = [];

    for (const p of allPeople) {
      if (alreadyAllocated.has(p.id)) continue;

      const nameKey = p.name.trim().toLowerCase();
      if (seenNames.has(nameKey)) continue;

      // Find the active record for this person during the relevant months
      const activeRecord = getActiveRecordForMonths(p.name, months);
      if (!activeRecord) continue;
      // Only show if their ACTIVE role matches the required role
      if (activeRecord.role_id !== roleId) continue;

      seenNames.add(nameKey);

      // Check employment status using the active record's dates
      const { employed, partialMonths } = isEmployedDuring(activeRecord, months);
      if (!employed) continue;

      // For priority 1, check not already primary elsewhere
      if (priority === 1 && (personPrimaryCount[activeRecord.id] || 0) > 0) continue;

      const warnings: string[] = [];

      // Only flag if leaving during the period
      if (partialMonths.length > 0) {
        const endDate = activeRecord.overall_end_date || activeRecord.employment_end_date;
        if (endDate) {
          warnings.push(`Leaving: ${format(parseISO(endDate), "MMM yy")}`);
        } else {
          const monthLabels = partialMonths.map(m => format(parseISO(`${m}-01`), "MMM yy"));
          warnings.push(`Unavailable: ${monthLabels.join(", ")}`);
        }
      }

      // Office matching
      const normalizedPersonOffice = normalizeOffice(p.office);
      const normalizedClientOffice = clientOffice && clientOffice !== "all"
        ? normalizeOffice(clientOffice)
        : null;
      const officeMatch = !normalizedClientOffice || normalizedPersonOffice === normalizedClientOffice;

      if (!officeMatch) {
        warnings.push(`Different office (${normalizedPersonOffice})`);
      }

      results.push({ person: p, warnings, officeMatch });
    }

    // Sort: office match first, then fewest warnings, then name
    results.sort((a, b) => {
      if (a.officeMatch !== b.officeMatch) return a.officeMatch ? -1 : 1;
      if (a.warnings.length !== b.warnings.length) return a.warnings.length - b.warnings.length;
      return a.person.name.localeCompare(b.person.name);
    });

    return results;
  }

  const totalAllocated = clientAllocations.length;

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Client Team</span>
              {totalAllocated > 0 && (
                <Badge variant="secondary" className="text-xs">{totalAllocated} assigned</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {isOpen ? "Click to collapse" : "Click to build your team"}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-6 px-6">
            {months.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No future months in the selected timeframe
              </p>
            ) : (
              <div className="space-y-6">
                {demandsByTeam.map(([team, demands]) => (
                  <div key={team}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b pb-1.5">
                      {team}
                    </h4>
                    <div className="space-y-4">
                      {demands
                        .sort((a, b) => Math.max(...Object.values(b.monthlyPct)) - Math.max(...Object.values(a.monthlyPct)))
                        .map((demand) => {
                          const slots = computePrioritySlots(demand.monthlyPct, months);
                          const roleAllocs = getRoleAllocations(demand.roleId);

                          return (
                            <RoleSlotCard
                              key={demand.roleId}
                              demand={demand}
                              slots={slots}
                              months={months}
                              roleAllocs={roleAllocs}
                              allPeople={allPeople}
                              getEligiblePeople={(priority) => getEligiblePeople(demand.roleId, priority)}
                              getPersonOtherClients={getPersonOtherClients}
                              onAssign={(personId, priority) =>
                                addAllocation.mutate({ personId, roleId: demand.roleId, priority })
                              }
                              onRemove={(id) => removeAllocation.mutate(id)}
                            />
                          );
                        })}
                    </div>
                  </div>
                ))}

                {demandsByTeam.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No role demands found for the selected timeframe
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ── Role Slot Card ──

function RoleSlotCard({
  demand,
  slots,
  months,
  roleAllocs,
  allPeople,
  getEligiblePeople,
  getPersonOtherClients,
  onAssign,
  onRemove,
}: {
  demand: RoleDemand;
  slots: Array<Record<string, number>>;
  months: string[];
  roleAllocs: any[];
  allPeople: any[];
  getEligiblePeople: (priority: number) => Array<{ person: any; warnings: string[]; officeMatch: boolean }>;
  getPersonOtherClients: (personId: string) => string[];
  onAssign: (personId: string, priority: number) => void;
  onRemove: (id: string) => void;
}) {
  const peakPct = Math.max(...Object.values(demand.monthlyPct));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/20 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{demand.roleName}</span>
            <Badge variant="outline" className="text-xs font-mono">
              peak {peakPct}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {slots.length} option{slots.length !== 1 ? "s" : ""} needed
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 items-end h-6">
          {months.map(m => {
            const pct = demand.monthlyPct[m] || 0;
            const barHeight = peakPct > 0 ? (pct / peakPct) * 100 : 0;
            return (
              <div
                key={m}
                className="flex-1 rounded-sm bg-primary/20 min-h-[2px]"
                style={{ height: `${Math.max(8, barHeight)}%` }}
                title={`${format(parseISO(`${m}-01`), "MMM yy")}: ${pct}%`}
              />
            );
          })}
        </div>
        <div className="flex gap-0.5 mt-0.5">
          {months.map(m => (
            <div key={m} className="flex-1 text-center text-[9px] text-muted-foreground leading-tight">
              {format(parseISO(`${m}-01`), "MMM")}
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y">
        {slots.map((slot, i) => {
          const priority = i + 1;
          const avgPct = getSlotAvgPct(slot, months);
          const label = getSlotLabel(i, avgPct, months, slot);
          const alloc = roleAllocs.find((a: any) => a.priority === priority);
          const person = alloc ? allPeople.find((p: any) => p.id === alloc.person_id) : null;
          const otherClients = alloc ? getPersonOtherClients(alloc.person_id) : [];
          const personWarning = (() => {
            if (!alloc || !person) return undefined;
            const endDate = person.overall_end_date || person.employment_end_date;
            if (endDate) {
              const lastMonth = months[months.length - 1];
              const lastMonthEnd = endOfMonth(parseISO(`${lastMonth}-01`));
              if (isBefore(parseISO(endDate), lastMonthEnd)) {
                return `Leaving: ${format(parseISO(endDate), "MMM yy")}`;
              }
            }
            return undefined;
          })();
          const eligible = getEligiblePeople(priority);
          const isFullTime = months.every(m => (slot[m] || 0) === 100);
          const isPartial = !isFullTime;

          return (
            <div key={priority} className={cn("px-4 py-2.5 flex items-center gap-3", isPartial && "bg-muted/10")}>
              <div className="min-w-[200px] flex items-center gap-2">
                <Badge
                  variant={isFullTime ? "default" : "outline"}
                  className={cn("text-[10px] font-mono shrink-0", isFullTime && "bg-primary")}
                >
                  {priority}
                </Badge>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>

              <div className="flex gap-px items-end h-4 min-w-[100px]">
                {months.map(m => {
                  const pct = slot[m] || 0;
                  return (
                    <div
                      key={m}
                      className={cn(
                        "flex-1 rounded-sm min-h-[1px]",
                        pct === 100 ? "bg-primary/60" : pct > 0 ? "bg-primary/30" : "bg-muted"
                      )}
                      style={{ height: `${Math.max(4, pct)}%` }}
                      title={`${format(parseISO(`${m}-01`), "MMM")}: ${pct}%`}
                    />
                  );
                })}
              </div>

              <div className="flex-1">
                <PersonSlot
                  person={person}
                  allocationId={alloc?.id}
                  otherClients={otherClients}
                  personWarning={personWarning}
                  eligiblePeople={eligible}
                  onAssign={(personId) => onAssign(personId, priority)}
                  onRemove={onRemove}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Person Slot ──

function PersonSlot({
  person,
  allocationId,
  otherClients,
  personWarning,
  eligiblePeople,
  onAssign,
  onRemove,
}: {
  person: any | null | undefined;
  allocationId?: string;
  otherClients: string[];
  personWarning?: string;
  eligiblePeople: Array<{ person: any; warnings: string[]; officeMatch: boolean }>;
  onAssign: (personId: string) => void;
  onRemove: (id: string) => void;
}) {
  const [selecting, setSelecting] = useState(false);

  if (person) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{person.name}</span>
        {person.office && <Badge variant="outline" className="text-[10px]">{normalizeOffice(person.office)}</Badge>}
        {personWarning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{personWarning}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {otherClients.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Also on: {otherClients.join(", ")}
          </span>
        )}
        {allocationId && (
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => onRemove(allocationId)}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  if (selecting) {
    return (
      <div className="flex items-center gap-2">
        <Select onValueChange={(v) => { onAssign(v); setSelecting(false); }}>
          <SelectTrigger className="h-7 w-[280px] text-xs">
            <SelectValue placeholder="Select person…" />
          </SelectTrigger>
          <SelectContent>
            {eligiblePeople.length === 0 ? (
              <SelectItem value="none" disabled>No available people for this role</SelectItem>
            ) : (
              eligiblePeople.map(({ person: p, warnings, officeMatch }) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-1.5">
                    <span className={cn(!officeMatch && "text-muted-foreground")}>
                      {p.name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      ({normalizeOffice(p.office)})
                    </span>
                    {warnings.length > 0 && (
                      <span className="text-amber-500 text-[10px]">⚠</span>
                    )}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelecting(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => setSelecting(true)}>
      <Plus className="h-3 w-3 mr-1" />
      Assign
    </Button>
  );
}
