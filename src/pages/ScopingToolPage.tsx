import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, Download, Save, Loader2, Plus, Trash2, RotateCcw, CalendarIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ScopeRole {
  roleName: string;
  totalHours: number;
  suggestedRatePerHour: number;
  monthlyHours: Record<string, number>;
}

interface GeneratedScope {
  rationale: string;
  months: string[];
  startDate: string;
  durationWeeks: number;
  roles: ScopeRole[];
  totalHours: number;
  internalCostPerHour: Record<string, number>;
  billableCapacity: Record<string, number>;
  currency: string;
  fxRate: number;
  scopedAgencyFee?: number;
  targetMarginPct?: number;
  rateCardFee?: number;
  rateCardBoosterPct?: number;
}

// Working days per month (approximation)
function workingDaysInMonth(year: number, month: number): number {
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function parseMonthLabel(label: string): { year: number; month: number } | null {
  const d = new Date(label.replace(/(\w{3}) (\d{4})/, "$1 1, $2"));
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() };
}

const currencySymbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

const fmtPct = (n: number) => `${Math.round(n)}%`;

const ScopingToolPage = () => {
  const queryClient = useQueryClient();

  const [office, setOffice] = useState("UK");
  const [client, setClient] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("12");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [selectedRateCard, setSelectedRateCard] = useState("");
  const [currency, setCurrency] = useState("GBP");

  const [scope, setScope] = useState<GeneratedScope | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScope, setEditedScope] = useState<GeneratedScope | null>(null);
  const [showPercentage, setShowPercentage] = useState(true);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [saveToExisting, setSaveToExisting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Currency formatter
  const sym = useMemo(() => currencySymbols[currency] || "£", [currency]);
  const fmtCur = useCallback((n: number) => {
    const s = currencySymbols[currency] || "£";
    return n < 0
      ? `(${s}${Math.abs(Math.round(n)).toLocaleString()})`
      : `${s}${Math.round(n).toLocaleString()}`;
  }, [currency]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-scoping"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, opportunity_number, sf_account, office")
          .order("title")
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  // Fetch client hierarchy data for smart rate card matching
  const { data: clientHierarchy = [] } = useQuery({
    queryKey: ["client-hierarchy"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("sf_account, parent_account, ultimate_parent, total_fees, office")
          .not("sf_account", "is", null)
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const p of clientHierarchy) {
      if (p.sf_account) set.add(p.sf_account);
      if (p.parent_account) set.add(p.parent_account);
      if (p.ultimate_parent) set.add(p.ultimate_parent);
    }
    return Array.from(set).sort();
  }, [clientHierarchy]);

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name, billable_capacity_hours").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch role-to-team mapping from people table
  const { data: roleTeamMap = {} } = useQuery({
    queryKey: ["role-team-map"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("role_id, team, roles(name)")
          .not("team", "is", null)
          .not("role_id", "is", null)
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      const counts: Record<string, Record<string, number>> = {};
      for (const p of allData) {
        const roleName = (p.roles as any)?.name;
        if (!roleName || !p.team) continue;
        if (!counts[roleName]) counts[roleName] = {};
        counts[roleName][p.team] = (counts[roleName][p.team] || 0) + 1;
      }
      const map: Record<string, string> = {};
      for (const [roleName, teams] of Object.entries(counts)) {
        map[roleName] = Object.entries(teams).sort((a, b) => b[1] - a[1])[0][0];
      }
      return map;
    },
  });

  // Fetch distinct rate card names
  const { data: rateCardNames = [] } = useQuery({
    queryKey: ["rate-card-names"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("rate_cards").select("name, currency").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      const map = new Map<string, string>();
      for (const rc of allData) {
        if (!map.has(rc.name)) map.set(rc.name, rc.currency);
      }
      return Array.from(map.entries()).map(([name, defaultCurrency]) => ({ name, defaultCurrency })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // Smart rate card matching: resolve client → parent → ultimate_parent, then fuzzy match
  const rateCardMatches = useMemo(() => {
    if (!client || rateCardNames.length === 0) return { best: null, others: [] as string[] };
    const cl = client.toLowerCase().trim();

    // Noise words to ignore in matching
    const noise = new Set(["the", "and", "ltd", "inc", "plc", "llc", "group", "company", "limited",
      "uk", "us", "usa", "global", "europe", "nordics", "germany", "france", "spain", "italy"]);

    // Extract the "core" brand name by stripping noise/geo and short tokens
    const extractBrand = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/)
        .filter((w) => w.length >= 3 && !noise.has(w));

    // Step 1: Find parent/ultimate_parent for this client via hierarchy
    // Only match if the core brand words of the client appear in the sf_account (or vice versa)
    const clientBrandWords = extractBrand(cl);
    const relatedBrands = new Set<string>(); // canonical brand names from hierarchy
    
    for (const p of clientHierarchy) {
      const sf = (p.sf_account || "").toLowerCase().trim();
      const pa = (p.parent_account || "").toLowerCase().trim();
      const up = (p.ultimate_parent || "").toLowerCase().trim();
      
      // Check if this project row is related to the entered client
      // Require that the primary brand word(s) match, not just "UK" etc.
      const sfBrand = extractBrand(sf);
      const paBrand = extractBrand(pa);
      const upBrand = extractBrand(up);
      
      const isRelated = 
        sf === cl || pa === cl || up === cl ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => sfBrand.includes(w))) ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => paBrand.includes(w))) ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => upBrand.includes(w)));
      
      if (isRelated) {
        // Add the parent and ultimate parent as related brands
        if (pa) relatedBrands.add(pa);
        if (up) relatedBrands.add(up);
      }
    }

    // Build set of all brand words from client + related hierarchy names
    const allBrandWords = new Set(clientBrandWords);
    for (const name of relatedBrands) {
      for (const w of extractBrand(name)) allBrandWords.add(w);
    }

    // Step 2: Score each rate card
    const scored: { name: string; score: number }[] = [];
    for (const rc of rateCardNames) {
      const rcl = rc.name.toLowerCase().trim();
      const rcBrand = extractBrand(rc.name);
      let score = 0;

      // Exact match with client or any related brand
      if (rcl === cl) { score = 100; }
      else if (relatedBrands.has(rcl)) { score = 95; }
      else {
        // Check if rc brand words overlap with our brand words (ignoring noise)
        if (rcBrand.length > 0 && allBrandWords.size > 0) {
          const matches = rcBrand.filter((w) => allBrandWords.has(w));
          if (matches.length > 0) {
            // Score based on proportion of rc brand words that match
            score = (matches.length / rcBrand.length) * 80;
          }
        }
      }

      if (score > 10) scored.push({ name: rc.name, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored.length > 0 ? scored[0].name : null;
    const others = scored.slice(1).map((s) => s.name);
    return { best, others };
  }, [client, rateCardNames, clientHierarchy]);

  // Auto-select best rate card when client changes
  useEffect(() => {
    if (rateCardMatches.best) {
      setSelectedRateCard(rateCardMatches.best);
      const rc = rateCardNames.find((r) => r.name === rateCardMatches.best);
      if (rc) setCurrency(rc.defaultCurrency);
    } else {
      setSelectedRateCard("");
    }
  }, [rateCardMatches.best, rateCardNames]);

  // Average fee for this client+office from real project data
  const { avgFeeForClient, avgFeeCount } = useMemo(() => {
    if (!client || clientHierarchy.length === 0) return { avgFeeForClient: null, avgFeeCount: 0 };
    const noise = new Set(["the", "and", "ltd", "inc", "plc", "llc", "group", "company", "limited",
      "uk", "us", "usa", "global", "europe", "nordics", "germany", "france", "spain", "italy"]);
    const extractBrand = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/)
        .filter((w) => w.length >= 3 && !noise.has(w));
    const clientBrandWords = extractBrand(client);
    if (clientBrandWords.length === 0) return { avgFeeForClient: null, avgFeeCount: 0 };

    const officeMap: Record<string, string[]> = { UK: ["uk", "united kingdom"], US: ["us", "united states"] };
    const officeValues = officeMap[office] || [];

    const fees: number[] = [];
    for (const p of clientHierarchy) {
      const sf = (p.sf_account || "").toLowerCase().trim();
      const pa = (p.parent_account || "").toLowerCase().trim();
      const up = (p.ultimate_parent || "").toLowerCase().trim();
      const sfBrand = extractBrand(sf);
      const paBrand = extractBrand(pa);
      const upBrand = extractBrand(up);
      const isRelated = clientBrandWords.some(w => sfBrand.includes(w) || paBrand.includes(w) || upBrand.includes(w));
      if (!isRelated) continue;
      
      // Filter by office if not "all"
      if (office !== "all") {
        const projOffice = (p.office || "").toLowerCase().trim();
        if (!officeValues.some(ov => projOffice.includes(ov))) continue;
      }

      if (p.total_fees && p.total_fees > 0) fees.push(p.total_fees);
    }

    if (fees.length === 0) return { avgFeeForClient: null, avgFeeCount: 0 };
    const avg = fees.reduce((s, f) => s + f, 0) / fees.length;
    return { avgFeeForClient: Math.round(avg), avgFeeCount: fees.length };
  }, [client, office, clientHierarchy]);

  const handleRateCardChange = (name: string) => {
    setSelectedRateCard(name);
    const rc = rateCardNames.find((r) => r.name === name);
    if (rc) setCurrency(rc.defaultCurrency);
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-scope", {
        body: {
          office,
          client: client || undefined,
          durationWeeks: durationWeeks ? parseInt(durationWeeks) : 12,
          budget: budget ? parseFloat(budget.replace(/,/g, "")) : undefined,
          startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
          rateCardName: selectedRateCard || undefined,
          currency: currency || "GBP",
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to generate scope");
      return data.scope as GeneratedScope;
    },
    onSuccess: (data) => {
      setScope(data);
      setEditedScope(JSON.parse(JSON.stringify(data)));
      setIsEditing(false);
      toast.success("Scope generated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate scope");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cs = editedScope || scope;
      if (!cs) throw new Error("No scope to save");

      let projectId: string;

      if (saveToExisting && selectedProjectId) {
        projectId = selectedProjectId;
        await supabase.from("project_scopes").delete().eq("project_id", projectId);
      } else {
        const sd = cs.startDate || format(startDate || new Date(), "yyyy-MM-dd");
        const w = cs.durationWeeks || parseInt(durationWeeks) || 12;
        const ed = new Date(new Date(sd).getTime() + w * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const { data: np, error: pe } = await supabase
          .from("projects")
          .insert({
            title: projectTitle || `Draft Scope - ${client || "New Project"}`,
            start_date: sd, end_date: ed,
            office: office || "UK", sf_account: client || null,
            stage: "Scoping", duration_weeks: w,
            fee_calc_currency: currency,
          })
          .select().single();
        if (pe) throw pe;
        projectId = np.id;
      }

      const { data: allRoles } = await supabase.from("roles").select("id, name");
      const rni: Record<string, string> = {};
      for (const r of allRoles || []) rni[r.name] = r.id;

      const scopesInsert = cs.roles.map((role) => {
        const pp: Record<string, number> = {};
        cs.months.forEach((m, i) => {
          const hrs = role.monthlyHours[m] || 0;
          pp[`Phase ${i + 1}`] = role.totalHours > 0 ? Math.round((hrs / role.totalHours) * 1000) / 10 : 0;
        });
        return {
          project_id: projectId,
          role_id: rni[role.roleName] || null,
          scoped_hours: role.totalHours,
          phase_percentages: pp,
        };
      });

      const { error: se } = await supabase.from("project_scopes").insert(scopesInsert);
      if (se) throw se;
      return projectId;
    },
    onSuccess: () => {
      toast.success("Scope saved successfully");
      setSaveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save scope"),
  });

  const exportCSV = useCallback(() => {
    const cs = editedScope || scope;
    if (!cs) return;
    const s = currencySymbols[cs.currency || currency] || "£";
    const header = ["Role", `Rate (${s}/hr)`, "Total Hours", ...cs.months, "", "Agency Fee", "Internal Cost", "Profit"];
    const rows = cs.roles.map((r) => {
      const cost = cs.internalCostPerHour?.[r.roleName] || 0;
      const fee = r.totalHours * r.suggestedRatePerHour;
      const ic = r.totalHours * cost;
      return [
        r.roleName, r.suggestedRatePerHour.toString(), r.totalHours.toString(),
        ...cs.months.map((m) => (r.monthlyHours[m] || 0).toString()),
        "", `${s}${Math.round(fee)}`, `${s}${Math.round(ic)}`, `${s}${Math.round(fee - ic)}`,
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scope-${client || "draft"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [editedScope, scope, client, currency]);

  const currentScope = isEditing ? editedScope : scope;
  const activeCurrency = currentScope?.currency || currency;
  const activeSym = currencySymbols[activeCurrency] || "£";
  const fmtActive = useCallback((n: number) => {
    return n < 0
      ? `(${activeSym}${Math.abs(Math.round(n)).toLocaleString()})`
      : `${activeSym}${Math.round(n).toLocaleString()}`;
  }, [activeSym]);

  // Compute monthly capacity hours for % view
  const monthCapacity = useMemo(() => {
    if (!currentScope) return {};
    const caps: Record<string, number> = {};
    for (const m of currentScope.months) {
      const parsed = parseMonthLabel(m);
      if (!parsed) { caps[m] = 165; continue; }
      caps[m] = workingDaysInMonth(parsed.year, parsed.month);
    }
    return caps;
  }, [currentScope]);

  // Financials
  const financials = useMemo(() => {
    if (!currentScope) return null;
    const monthlyRateCardFee: Record<string, number> = {};
    const monthlyFee: Record<string, number> = {};
    const monthlyCost: Record<string, number> = {};
    let totalRateCardFee = 0;
    let totalCost = 0;

    for (const m of currentScope.months) {
      monthlyRateCardFee[m] = 0;
      monthlyFee[m] = 0;
      monthlyCost[m] = 0;
    }

    for (const role of currentScope.roles) {
      const rate = role.suggestedRatePerHour || 0;
      const cost = currentScope.internalCostPerHour?.[role.roleName] || 0;
      for (const m of currentScope.months) {
        const hrs = role.monthlyHours[m] || 0;
        monthlyRateCardFee[m] += hrs * rate;
        monthlyCost[m] += hrs * cost;
      }
      totalRateCardFee += role.totalHours * rate;
      totalCost += role.totalHours * cost;
    }

    const totalFee = currentScope.scopedAgencyFee ?? totalRateCardFee;
    const feeScale = totalRateCardFee > 0 ? (totalFee / totalRateCardFee) : 1;
    for (const m of currentScope.months) {
      monthlyFee[m] = monthlyRateCardFee[m] * feeScale;
    }

    return { monthlyFee, monthlyCost, totalFee, totalCost, totalRateCardFee };
  }, [currentScope]);

  // Group roles by team and sort by hours descending within each team
  const groupedRoles = useMemo(() => {
    if (!currentScope) return [];
    const teamGroups: Record<string, { role: ScopeRole; originalIndex: number }[]> = {};
    currentScope.roles.forEach((role, i) => {
      const team = roleTeamMap[role.roleName] || "Other";
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push({ role, originalIndex: i });
    });
    // Sort roles within each team by total hours descending
    for (const team of Object.keys(teamGroups)) {
      teamGroups[team].sort((a, b) => b.role.totalHours - a.role.totalHours);
    }
    // Sort teams by total team hours descending
    const sorted = Object.entries(teamGroups).sort((a, b) => {
      const aHrs = a[1].reduce((s, r) => s + r.role.totalHours, 0);
      const bHrs = b[1].reduce((s, r) => s + r.role.totalHours, 0);
      return bHrs - aHrs;
    });
    return sorted;
  }, [currentScope, roleTeamMap]);

  const updateMonthlyHours = (ri: number, month: string, hrs: number) => {
    if (!editedScope) return;
    const u = { ...editedScope, roles: [...editedScope.roles] };
    u.roles[ri] = { ...u.roles[ri], monthlyHours: { ...u.roles[ri].monthlyHours, [month]: hrs } };
    u.roles[ri].totalHours = Object.values(u.roles[ri].monthlyHours).reduce((s, h) => s + h, 0);
    u.totalHours = u.roles.reduce((s, r) => s + r.totalHours, 0);
    setEditedScope(u);
  };

  const updateRate = (ri: number, rate: number) => {
    if (!editedScope) return;
    const u = { ...editedScope, roles: [...editedScope.roles] };
    u.roles[ri] = { ...u.roles[ri], suggestedRatePerHour: rate };
    setEditedScope(u);
  };

  const removeRole = (i: number) => {
    if (!editedScope) return;
    const u = { ...editedScope, roles: editedScope.roles.filter((_, j) => j !== i) };
    u.totalHours = u.roles.reduce((s, r) => s + r.totalHours, 0);
    setEditedScope(u);
  };

  const addRole = (name: string) => {
    if (!editedScope) return;
    const mh: Record<string, number> = {};
    editedScope.months.forEach((m) => (mh[m] = 0));
    setEditedScope({
      ...editedScope,
      roles: [...editedScope.roles, { roleName: name, totalHours: 0, suggestedRatePerHour: 0, monthlyHours: mh }],
    });
  };

  const getCellValue = (hours: number, roleName: string, month: string) => {
    if (!showPercentage) return hours > 0 ? Math.round(hours) : "–";
    const cap = currentScope?.billableCapacity?.[roleName] || 7.5;
    const days = monthCapacity[month] || 22;
    const monthCap = days * cap;
    if (monthCap === 0) return "–";
    const pct = (hours / monthCap) * 100;
    return hours > 0 ? `${Math.round(pct)}%` : "–";
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scoping Tool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate AI-powered draft scopes based on actual historical project phasing
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Office</Label>
              <Select value={office} onValueChange={setOffice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="all">All offices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client / Account</Label>
              <Input placeholder="e.g. Nike..." value={client} onChange={(e) => setClient(e.target.value)} list="cl" />
              <datalist id="cl">{clients.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-2">
              <Label>Rate Card</Label>
              <Select value={selectedRateCard} onValueChange={handleRateCardChange}>
                <SelectTrigger><SelectValue placeholder="Select rate card..." /></SelectTrigger>
                <SelectContent>
                  {rateCardNames.map((rc) => (
                    <SelectItem key={rc.name} value={rc.name}>
                      {rc.name} ({rc.defaultCurrency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rateCardMatches.best && selectedRateCard === rateCardMatches.best && (
                <p className="text-xs text-muted-foreground">✓ Best match for this client</p>
              )}
              {rateCardMatches.others.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Also available:{" "}
                  {rateCardMatches.others.slice(0, 3).map((name, i) => (
                    <span key={name}>
                      {i > 0 && ", "}
                      <button className="text-primary hover:underline" onClick={() => handleRateCardChange(name)}>
                        {name}
                      </button>
                    </span>
                  ))}
                  {rateCardMatches.others.length > 3 && ` +${rateCardMatches.others.length - 3} more`}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, "dd MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Duration (weeks)</Label>
              <Input type="number" placeholder="12" value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Agency Fee Budget ({sym})</Label>
              <Input
                placeholder="e.g. 150,000"
                value={budget}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setBudget(raw ? Number(raw).toLocaleString() : "");
                }}
              />
              {avgFeeForClient !== null && (
                <p className="text-xs text-muted-foreground">
                  Avg. fee for this client{office !== "all" ? ` (${office})` : ""}: {fmtCur(avgFeeForClient)} ({avgFeeCount} project{avgFeeCount !== 1 ? "s" : ""})
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generateMutation.isPending ? "Generating..." : "Generate Scope"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Output */}
      {currentScope && financials && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">AI Rationale</CardTitle>
                  {currentScope.fxRate && currentScope.fxRate !== 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      FX rate locked: 1 GBP = {currentScope.fxRate.toFixed(4)} {activeCurrency}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditedScope(JSON.parse(JSON.stringify(scope))); }}>
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
                  <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Save className="h-3.5 w-3.5" /> Save</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Save Scope</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="flex gap-2">
                          <Button variant={!saveToExisting ? "default" : "outline"} size="sm" onClick={() => setSaveToExisting(false)}>New Project</Button>
                          <Button variant={saveToExisting ? "default" : "outline"} size="sm" onClick={() => setSaveToExisting(true)}>Attach to Existing</Button>
                        </div>
                        {!saveToExisting ? (
                          <div className="space-y-2">
                            <Label>Project Title</Label>
                            <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder={`Draft - ${client || "New Project"}`} />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Select Project</Label>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                              <SelectTrigger><SelectValue placeholder="Choose a project..." /></SelectTrigger>
                              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saveToExisting ? "Attach Scope" : "Create Project"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{currentScope.rationale}</p>
            </CardContent>
          </Card>

          {/* Summary badges */}
          <div className="flex gap-3 flex-wrap items-center justify-between">
            <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" className="text-sm py-1 px-3">{currentScope.durationWeeks || durationWeeks} weeks</Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">{currentScope.roles.reduce((s, r) => s + Math.round(r.totalHours), 0).toLocaleString()} hours</Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">{currentScope.roles.length} roles</Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">{activeCurrency}</Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">Fee: {fmtActive(financials.totalFee)}</Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">Cost: {fmtActive(financials.totalCost)}</Badge>
            <Badge variant="secondary" className={cn("text-sm py-1 px-3", financials.totalFee - financials.totalCost < 0 && "bg-destructive/10 text-destructive")}>
              Profit: {fmtActive(financials.totalFee - financials.totalCost)}
            </Badge>
            <Badge variant="secondary" className={cn("text-sm py-1 px-3", financials.totalFee > 0 && ((financials.totalFee - financials.totalCost) / financials.totalFee) < 0.2 && "bg-destructive/10 text-destructive")}>
              Margin: {financials.totalFee > 0 ? fmtPct(((financials.totalFee - financials.totalCost) / financials.totalFee) * 100) : "–"}
            </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hours</span>
              <Switch checked={showPercentage} onCheckedChange={setShowPercentage} />
              <span className="text-muted-foreground">% Capacity</span>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px] sticky left-0 bg-card z-10">Role</TableHead>
                      <TableHead className="text-right w-[80px]">Rate {activeSym}/hr</TableHead>
                      <TableHead className="text-right w-[70px]">Total</TableHead>
                      {currentScope.months.map((m) => (
                        <TableHead key={m} className="text-right min-w-[70px] text-xs">{m}</TableHead>
                      ))}
                      {isEditing && <TableHead className="w-[40px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRoles.map(([teamName, members]) => (
                      <React.Fragment key={teamName}>
                        {/* Team header row */}
                        <TableRow className="bg-muted/30">
                          <TableCell
                            colSpan={3 + currentScope.months.length + (isEditing ? 1 : 0)}
                            className="sticky left-0 bg-muted/30 z-10 font-semibold text-xs uppercase tracking-wider text-muted-foreground py-2"
                          >
                            {teamName}
                          </TableCell>
                        </TableRow>
                        {members.map(({ role, originalIndex: ri }) => (
                          <TableRow key={ri}>
                            <TableCell className="font-medium sticky left-0 bg-card z-10 text-sm pl-6">{role.roleName}</TableCell>
                            <TableCell className="text-right text-sm">
                              {isEditing ? (
                                <Input type="number" className="w-16 text-right h-7 text-xs" value={role.suggestedRatePerHour}
                                  onChange={(e) => updateRate(ri, parseFloat(e.target.value) || 0)} />
                              ) : (
                                `${activeSym}${Number(role.suggestedRatePerHour).toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">{Math.round(role.totalHours)}</TableCell>
                            {currentScope.months.map((m) => {
                              const hrs = role.monthlyHours[m] || 0;
                              return (
                                <TableCell key={m} className="text-right text-xs">
                                  {isEditing ? (
                                    <Input type="number" className="w-14 text-right h-7 text-xs" value={hrs}
                                      onChange={(e) => updateMonthlyHours(ri, m, parseFloat(e.target.value) || 0)} />
                                  ) : (
                                    getCellValue(hrs, role.roleName, m)
                                  )}
                                </TableCell>
                              );
                            })}
                            {isEditing && (
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRole(ri)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}

                    {/* Total hours row */}
                    <TableRow className="bg-muted/60 font-semibold">
                      <TableCell className="sticky left-0 bg-muted/60 z-10">TOTAL HOURS</TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        {currentScope.roles.reduce((s, r) => s + Math.round(r.totalHours), 0).toLocaleString()}
                      </TableCell>
                      {currentScope.months.map((m) => {
                        const total = currentScope.roles.reduce((s, r) => s + Math.round(r.monthlyHours[m] || 0), 0);
                        return <TableCell key={m} className="text-right text-xs">{total > 0 ? total : "–"}</TableCell>;
                      })}
                      {isEditing && <TableCell />}
                    </TableRow>

                    {/* Agency Fee row */}
                    <TableRow className="border-t-2">
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">Agency Fee</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-medium text-sm">{fmtActive(financials.totalFee)}</TableCell>
                      {currentScope.months.map((m) => (
                        <TableCell key={m} className="text-right text-xs">{financials.monthlyFee[m] > 0 ? fmtActive(financials.monthlyFee[m]) : "–"}</TableCell>
                      ))}
                      {isEditing && <TableCell />}
                    </TableRow>

                    {/* Internal Cost row */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">Internal Cost</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-medium text-sm">{fmtActive(financials.totalCost)}</TableCell>
                      {currentScope.months.map((m) => (
                        <TableCell key={m} className="text-right text-xs">{financials.monthlyCost[m] > 0 ? fmtActive(financials.monthlyCost[m]) : "–"}</TableCell>
                      ))}
                      {isEditing && <TableCell />}
                    </TableRow>

                    {/* Profit row */}
                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">Profit</TableCell>
                      <TableCell />
                      <TableCell className={cn("text-right font-medium text-sm", financials.totalFee - financials.totalCost < 0 && "text-destructive")}>
                        {fmtActive(financials.totalFee - financials.totalCost)}
                      </TableCell>
                      {currentScope.months.map((m) => {
                        const profit = (financials.monthlyFee[m] || 0) - (financials.monthlyCost[m] || 0);
                        return (
                          <TableCell key={m} className={cn("text-right text-xs", profit < 0 && "text-destructive")}>
                            {(financials.monthlyFee[m] || 0) > 0 || (financials.monthlyCost[m] || 0) > 0 ? fmtActive(profit) : "–"}
                          </TableCell>
                        );
                      })}
                      {isEditing && <TableCell />}
                    </TableRow>

                    {/* Margin row */}
                    <TableRow className="bg-muted/40">
                      <TableCell className="sticky left-0 bg-muted/40 z-10 font-semibold text-sm">Margin</TableCell>
                      <TableCell />
                      <TableCell className={cn("text-right font-semibold text-sm",
                        financials.totalFee > 0 && ((financials.totalFee - financials.totalCost) / financials.totalFee) < 0.2 && "text-destructive"
                      )}>
                        {financials.totalFee > 0 ? fmtPct(((financials.totalFee - financials.totalCost) / financials.totalFee) * 100) : "–"}
                      </TableCell>
                      {currentScope.months.map((m) => {
                        const fee = financials.monthlyFee[m] || 0;
                        const cost = financials.monthlyCost[m] || 0;
                        const margin = fee > 0 ? ((fee - cost) / fee) * 100 : 0;
                        return (
                          <TableCell key={m} className={cn("text-right text-xs font-medium", fee > 0 && margin < 20 && "text-destructive")}>
                            {fee > 0 ? fmtPct(margin) : "–"}
                          </TableCell>
                        );
                      })}
                      {isEditing && <TableCell />}
                    </TableRow>

                    {/* Rate Card Note row */}
                    {currentScope.rateCardFee != null && currentScope.rateCardFee > 0 && (
                      <TableRow className="bg-primary/5">
                        <TableCell
                          colSpan={3 + currentScope.months.length + (isEditing ? 1 : 0)}
                          className="sticky left-0 bg-primary/5 z-10 text-sm py-3"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              Per the rate card, this work could be delivered for{" "}
                              <span className="font-semibold">{fmtActive(currentScope.rateCardFee)}</span>
                              {" "}— or delivered at the scoped agency fee of{" "}
                              <span className="font-semibold">{fmtActive(currentScope.scopedAgencyFee ?? financials.totalFee)}</span>
                              {currentScope.rateCardBoosterPct != null && currentScope.rateCardBoosterPct > 0 && (
                                <> with a rate card booster of <span className="font-semibold text-primary">{currentScope.rateCardBoosterPct.toFixed(1)}%</span></>
                              )}
                              {currentScope.rateCardBoosterPct != null && currentScope.rateCardBoosterPct < 0 && (
                                <> with a rate card discount of <span className="font-semibold text-destructive">{Math.abs(currentScope.rateCardBoosterPct).toFixed(1)}%</span></>
                              )}
                              .
                            </span>
                            {currentScope.targetMarginPct != null && (
                              <span className="text-xs text-muted-foreground">
                                Target margin from realised profitability: {currentScope.targetMarginPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {isEditing && (
                <div className="mt-3">
                  <Select onValueChange={(v) => addRole(v)}>
                    <SelectTrigger className="w-[250px]">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <SelectValue placeholder="Add role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((r) => !currentScope.roles.some((sr) => sr.roleName === r.name))
                        .map((r) => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ScopingToolPage;
