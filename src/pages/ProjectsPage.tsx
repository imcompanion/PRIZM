import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Trash2, CalendarIcon, Filter, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/calculations";
import { useNavigate } from "react-router-dom";

const ProjectsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore scroll position after data loads
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current) return;
    const saved = sessionStorage.getItem("projects-scroll");
    if (saved && scrollRef.current && !isLoading) {
      scrollRef.current.scrollTop = parseInt(saved, 10);
      scrollRestored.current = true;
    }
  });

  const navigateToProject = useCallback((projectId: string) => {
    if (scrollRef.current) {
      sessionStorage.setItem("projects-scroll", String(scrollRef.current.scrollTop));
    }
    navigate(`/projects/${projectId}`);
  }, [navigate]);

  const [filters, setFilters] = useState<{
    stage: string;
    office: string;
    sfAccount: string;
    parentAccount: string;
    ultimateParent: string;
    endDateAfter: Date | undefined;
    endDateBefore: Date | undefined;
    status: string;
    burnMin: string;
    burnMax: string;
    budgetMin: string;
    budgetMax: string;
  }>({
    stage: "",
    office: "",
    sfAccount: "",
    parentAccount: "",
    ultimateParent: "",
    endDateAfter: undefined,
    endDateBefore: undefined,
    status: "",
    burnMin: "",
    burnMax: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("*, project_scopes(*, roles(name)), rate_cards(name, hourly_rate, roles(name))")
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  // Fetch aggregated hours per project via DB function
  const { data: projectHoursData = [] } = useQuery({
    queryKey: ["project_hours"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_project_hours");
      if (error) throw error;
      return data as { project_id: string; total_hours: number }[];
    },
  });

  // Build lookup map
  const actualHoursByProject = projectHoursData.reduce<Record<string, number>>((acc, row) => {
    acc[row.project_id] = row.total_hours;
    return acc;
  }, {});

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const getExtraNum = (project: any, ...keys: string[]): number | null => {
    const extra = project.extra_data;
    if (!extra) return null;
    for (const k of keys) {
      const val = extra[k];
      if (val != null) {
        const n = parseFloat(String(val).replace(/[£$,%]/g, "").replace(/,/g, ""));
        if (!isNaN(n)) return n;
      }
    }
    return null;
  };

  const getTotalBudget = (project: any) => {
    const price = project.price ?? getExtraNum(project, "total price", "price gbp/usd", "price");
    const mediaCost = project.media_cost ?? getExtraNum(project, "media cost", "cost - paid media budget") ?? 0;
    const grossBudget = project.gross_budget ?? getExtraNum(project, "gross budget full value (gbp / usd)", "gross budget full value", "gross budget", "cost - net budget") ?? 0;
    if (price === null) return null;
    return price - mediaCost - grossBudget;
  };

  return (
    <div className="p-8 h-screen flex flex-col overflow-hidden border-[#faf8f5] bg-[#faf8f5]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Projects imported from Data Summary</p>
        </div>
      </div>

      {/* Filter bar */}
      {(() => {
        const uniqueVals = (key: string) => [...new Set(projects.map((p) => (p as any)[key]).filter(Boolean))].sort();
        const activeCount = [filters.stage, filters.office, filters.sfAccount, filters.parentAccount, filters.ultimateParent, filters.status, filters.burnMin, filters.burnMax, filters.budgetMin, filters.budgetMax].filter(Boolean).length
          + (filters.endDateAfter ? 1 : 0) + (filters.endDateBefore ? 1 : 0);

        return (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-9 pr-9 h-9"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" />
                Filters{activeCount > 0 && ` (${activeCount})`}
              </Button>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilters({ stage: "", office: "", sfAccount: "", parentAccount: "", ultimateParent: "", endDateAfter: undefined, endDateBefore: undefined, status: "", burnMin: "", burnMax: "", budgetMin: "", budgetMax: "" })}>
                  <X className="h-3 w-3 mr-1" />Clear all
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="min-w-[150px]">
                  <Label className="text-xs">Stage</Label>
                  <Select value={filters.stage} onValueChange={(v) => setFilters({ ...filters, stage: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      {uniqueVals("stage").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Office</Label>
                  <Select value={filters.office} onValueChange={(v) => setFilters({ ...filters, office: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      {uniqueVals("office").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">SF Account</Label>
                  <Select value={filters.sfAccount} onValueChange={(v) => setFilters({ ...filters, sfAccount: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      {uniqueVals("sf_account").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Parent Account</Label>
                  <Select value={filters.parentAccount} onValueChange={(v) => setFilters({ ...filters, parentAccount: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      {uniqueVals("parent_account").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Ultimate Parent</Label>
                  <Select value={filters.ultimateParent} onValueChange={(v) => setFilters({ ...filters, ultimateParent: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      {uniqueVals("ultimate_parent").map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">End Date After</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left text-xs h-8 bg-background", !filters.endDateAfter && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {filters.endDateAfter ? format(filters.endDateAfter, "dd MMM yyyy") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={filters.endDateAfter} onSelect={(d) => setFilters({ ...filters, endDateAfter: d })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">End Date Before</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-full justify-start text-left text-xs h-8 bg-background", !filters.endDateBefore && "text-muted-foreground")}>
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {filters.endDateBefore ? format(filters.endDateBefore, "dd MMM yyyy") : "Any"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={filters.endDateBefore} onSelect={(d) => setFilters({ ...filters, endDateBefore: d })} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === "__all__" ? "" : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="__all__">All</SelectItem>
                      <SelectItem value="Live">Live</SelectItem>
                      <SelectItem value="Ended">Ended</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Burn % Range</Label>
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Min" className="h-8 text-xs bg-background w-[70px]" value={filters.burnMin} onChange={(e) => setFilters({ ...filters, burnMin: e.target.value })} />
                    <Input type="number" placeholder="Max" className="h-8 text-xs bg-background w-[70px]" value={filters.burnMax} onChange={(e) => setFilters({ ...filters, burnMax: e.target.value })} />
                  </div>
                </div>
                <div className="min-w-[150px]">
                  <Label className="text-xs">Budget Range</Label>
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Min" className="h-8 text-xs bg-background w-[70px]" value={filters.budgetMin} onChange={(e) => setFilters({ ...filters, budgetMin: e.target.value })} />
                    <Input type="number" placeholder="Max" className="h-8 text-xs bg-background w-[70px]" value={filters.budgetMax} onChange={(e) => setFilters({ ...filters, budgetMax: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div className="overflow-auto h-full" ref={scrollRef}>
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border))] [&_tr]:border-b">
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Scoped Hours</TableHead>
                <TableHead>Agency Fees</TableHead>
                <TableHead>Burn (Hours)</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SF Account</TableHead>
                <TableHead>Parent Account</TableHead>
                <TableHead>Ultimate Parent</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Office</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </thead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : projects.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">No projects yet. Import data via Settings → Data.</TableCell></TableRow>
              ) : (() => {
                const q = searchQuery.toLowerCase();
                const getProjectStatus = (p: any) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const start = new Date(p.start_date);
                  const end = new Date(p.end_date);
                  if (today < start) return "Not Started";
                  if (today > end) return "Ended";
                  return "Live";
                };
                const filtered = projects.filter((p) => {
                  if (q && ![p.title, (p as any).opportunity_number, (p as any).sf_account, (p as any).parent_account, (p as any).ultimate_parent, (p as any).stage, (p as any).office, getProjectStatus(p)]
                    .filter(Boolean).some((v: string) => v.toLowerCase().includes(q))) return false;
                  if (filters.stage && (p as any).stage !== filters.stage) return false;
                  if (filters.office && (p as any).office !== filters.office) return false;
                  if (filters.sfAccount && (p as any).sf_account !== filters.sfAccount) return false;
                  if (filters.parentAccount && (p as any).parent_account !== filters.parentAccount) return false;
                  if (filters.ultimateParent && (p as any).ultimate_parent !== filters.ultimateParent) return false;
                  if (filters.endDateAfter && new Date(p.end_date) < filters.endDateAfter) return false;
                  if (filters.endDateBefore && new Date(p.end_date) > filters.endDateBefore) return false;
                  if (filters.status && getProjectStatus(p) !== filters.status) return false;
                  // Burn filter
                  const totalH = (p.project_scopes || []).reduce((s: number, sc: any) => s + sc.scoped_hours, 0);
                  const burnPct = totalH > 0 ? Math.round(((actualHoursByProject[p.id] || 0) / totalH) * 100) : 0;
                  if (filters.burnMin && burnPct < parseFloat(filters.burnMin)) return false;
                  if (filters.burnMax && burnPct > parseFloat(filters.burnMax)) return false;
                  // Budget filter
                  const bud = getTotalBudget(p);
                  if (filters.budgetMin && (bud === null || bud < parseFloat(filters.budgetMin))) return false;
                  if (filters.budgetMax && (bud === null || bud > parseFloat(filters.budgetMax))) return false;
                  return true;
                });
                if (filtered.length === 0) return (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">No matching projects.</TableCell></TableRow>
                );
                return filtered.map((project) => {
                  const totalHours = (project.project_scopes || []).reduce((s: number, sc: any) => s + sc.scoped_hours, 0);
                  const budget = getTotalBudget(project);
                  return (
                    <TableRow key={project.id} className="cursor-pointer" onClick={() => navigateToProject(project.id)}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{project.title}</span>
                          {(() => {
                            const status = getProjectStatus(project);
                            return (
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 leading-4 font-medium shrink-0",
                                status === "Live" ? "border-success text-success" :
                                status === "Ended" ? "border-muted-foreground text-muted-foreground" :
                                "border-amber-500 text-amber-500"
                              )}>
                                {status}
                              </Badge>
                            );
                          })()}
                        </div>
                        {(project as any).opportunity_number && (
                          <div className="text-xs text-muted-foreground">{(project as any).opportunity_number}</div>
                        )}
                      </TableCell>
                      <TableCell>{totalHours}h</TableCell>
                      <TableCell>{budget !== null ? formatCurrency(budget) : "—"}</TableCell>
                      <TableCell>
                        {(() => {
                          const actual = actualHoursByProject[project.id] || 0;
                          if (totalHours === 0) return "—";
                          const burnPct = Math.round((actual / totalHours) * 100);
                          return <span className={cn(burnPct > 100 && "text-destructive font-semibold")}>{burnPct}%</span>;
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const s = new Date(project.start_date);
                          const e = new Date(project.end_date);
                          const fmtS = isNaN(s.getTime()) ? "—" : format(s, "dd MMM");
                          const fmtE = isNaN(e.getTime()) ? "—" : format(e, "dd MMM yyyy");
                          return `${fmtS} – ${fmtE}`;
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const start = new Date(project.start_date);
                          const end = new Date(project.end_date);
                          if (today < start) return <span className="text-muted-foreground">Not Started</span>;
                          if (today > end) return <span className="text-destructive">Ended</span>;
                          return <span className="text-green-600 font-medium">Live</span>;
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">{(project as any).sf_account || "—"}</TableCell>
                      <TableCell className="text-sm">{(project as any).parent_account || "—"}</TableCell>
                      <TableCell className="text-sm">{(project as any).ultimate_parent || "—"}</TableCell>
                      <TableCell className="text-sm">{(project as any).stage || "—"}</TableCell>
                      <TableCell className="text-sm">{(project as any).office || "—"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteProject.mutate(project.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsPage;
