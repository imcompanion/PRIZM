import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, parse, formatDistanceToNow } from "date-fns";

// ─── Date helpers ───────────────────────────────────────────────────────

const tryParseDate = (val: string): string | null => {
  if (!val?.trim()) return null;
  const formats = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd MMM yyyy", "MMM dd, yyyy"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.trim(), fmt, new Date());
      if (!isNaN(parsed.getTime())) return format(parsed, "yyyy-MM-dd");
    } catch {}
  }
  const native = new Date(val.trim());
  if (!isNaN(native.getTime())) return format(native, "yyyy-MM-dd");
  return null;
};

const parseDateSimple = (val: string): string | null => {
  if (!val?.trim()) return null;
  const d = new Date(val.trim());
  if (isNaN(d.getTime())) return null;
  return format(d, "yyyy-MM-dd");
};

const normalizeRoleName = (value: string) => value.replace(/^["']+|["']+$/g, "").trim().toLowerCase();
const cleanStr = (value: string) => value.replace(/^["']+|["']+$/g, "").trim();

const buildUniqueRoleUpserts = (names: Iterable<string>) => {
  const seen = new Set<string>();
  const uniqueRoles: { name: string; billable_capacity_hours: number }[] = [];

  for (const rawName of names) {
    const trimmedName = rawName.replace(/^["']+|["']+$/g, "").trim();
    const normalizedName = trimmedName.toLowerCase();

    if (!trimmedName || seen.has(normalizedName)) continue;

    seen.add(normalizedName);
    uniqueRoles.push({ name: trimmedName, billable_capacity_hours: 7.5 });
  }

  return uniqueRoles;
};

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizePersonIdentity = (row: { code?: string | null; name: string }) => {
  const normalizedCode = stripDiacritics(row.code?.trim().toLowerCase() || "");
  if (normalizedCode) return `code:${normalizedCode}`;
  return `name:${stripDiacritics(row.name.trim().toLowerCase())}`;
};

// A person can have multiple employment-window rows in the people table — each row
// represents a stage of their employment history (different role / start date).
// The unique key for a window is (person identity) + role_id + employment_start_date.
const normalizePersonWindowKey = (row: {
  code?: string | null;
  name: string;
  role_id?: string | null;
  employment_start_date?: string | null;
}) =>
  `${normalizePersonIdentity(row)}|role:${row.role_id || "none"}|start:${row.employment_start_date || "none"}`;

// ─── Record import timestamp ────────────────────────────────────────────

const recordImport = async (dataset: string, rowCount: number, queryClient: any) => {
  await supabase.from("data_imports" as any).upsert(
    { dataset, last_imported_at: new Date().toISOString(), row_count: rowCount } as any,
    { onConflict: "dataset" } as any
  );
  queryClient.invalidateQueries({ queryKey: ["data_imports"] });
};

const relinkTimeEntriesFromFallbacks = async () => {
  const { data, error } = await (supabase as any).rpc("relink_time_entries_from_fallbacks");
  if (error) throw error;
  return (data || {}) as { relinkedPeople?: number; relinkedProjects?: number };
};

// ─── Import Panel wrapper ───────────────────────────────────────────────

const ImportPanel = ({
  title,
  description,
  columns,
  placeholder,
  pasteData,
  setPasteData,
  onImport,
  isPending,
  buttonLabel,
  warning,
  lastImported,
}: {
  title: string;
  description: string;
  columns: string;
  placeholder: string;
  pasteData: string;
  setPasteData: (v: string) => void;
  onImport: () => void;
  isPending: boolean;
  buttonLabel: string;
  warning?: string;
  lastImported?: { last_imported_at: string; row_count: number } | null;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg font-display">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {lastImported && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md shrink-0">
            <Clock className="h-3 w-3" />
            <span>
              Last import: {formatDistanceToNow(new Date(lastImported.last_imported_at), { addSuffix: true })}
              {" · "}{lastImported.row_count} rows
            </span>
          </div>
        )}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Copy rows from Google Sheets with columns: <strong>{columns}</strong> — and paste below.
      </p>
      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}
      <Textarea
        rows={10}
        placeholder={placeholder}
        value={pasteData}
        onChange={(e) => setPasteData(e.target.value)}
        className="font-mono text-xs"
      />
      <Button onClick={onImport} disabled={!pasteData.trim() || isPending} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {isPending ? "Importing..." : buttonLabel}
      </Button>
    </CardContent>
  </Card>
);

// ─── Roles & Capacities Tab ─────────────────────────────────────────────

const HOURS_PER_DAY = 7.5;

const RolesImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const importRoles = useMutation({
    mutationFn: async (rows: { name: string; billable_capacity_hours: number }[]) => {
      // Upsert by name to preserve existing IDs and foreign key links
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("roles").upsert(rows.slice(i, i + 500), { onConflict: "name" });
        if (error) throw error;
      }
      // Delete roles not in the import
      const importedNames = rows.map(r => r.name);
      const { data: existing } = await supabase.from("roles").select("id, name");
      const toDelete = (existing || []).filter(r => !importedNames.includes(r.name)).map(r => r.id);
      if (toDelete.length > 0) {
        await supabase.from("roles").delete().in("id", toDelete);
      }
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setPasteData("");
      recordImport("roles", rows.length, queryClient);
      toast.success(`${rows.length} roles imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (!lines.length) { toast.error("No data"); return; }

    const rows: { name: string; billable_capacity_hours: number }[] = [];
    for (const line of lines) {
      const parts = line.split("\t");
      const roleName = parts[0]?.trim();
      if (!roleName) continue;
      const capStr = parts[1]?.trim().replace("%", "") || "100";
      const capNum = parseFloat(capStr);
      rows.push({ name: roleName, billable_capacity_hours: (isNaN(capNum) ? 100 : capNum) / 100 * HOURS_PER_DAY });
    }

    if (!rows.length) { toast.error("No data"); return; }
    importRoles.mutate(rows);
  };

  return (
    <ImportPanel
      title="Import Roles & Capacities"
      description="Replace all roles with a fresh paste from your roles spreadsheet."
      columns="Role, Billable Capacity %"
      placeholder={"Designer\t80\nDeveloper\t100\nProject Manager\t50"}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importRoles.isPending}
      buttonLabel="Import Roles"
      warning="This will replace all existing roles. Other data (people, scopes) will keep their current role references."
      lastImported={lastImported}
    />
  );
};

// ─── People Tab ─────────────────────────────────────────────────────────

const PeopleImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });


  const importPeople = useMutation({
    mutationFn: async (rows: any[]) => {
      const BATCH = 500;
      const existingPeople: {
        id: string;
        code: string | null;
        name: string;
        role_id: string | null;
        employment_start_date: string | null;
        created_at: string;
      }[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, code, name, role_id, employment_start_date, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + 999);

        if (error) throw error;
        existingPeople.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }

      // Index existing rows by composite window key (identity + role + start date)
      // and also by identity alone for fallback / cleanup logic.
      const existingByWindow = new Map<string, typeof existingPeople>();
      const existingByIdentity = new Map<string, typeof existingPeople>();
      for (const person of existingPeople) {
        const wKey = normalizePersonWindowKey(person);
        const wCur = existingByWindow.get(wKey) || [];
        wCur.push(person);
        existingByWindow.set(wKey, wCur);

        const iKey = normalizePersonIdentity(person);
        const iCur = existingByIdentity.get(iKey) || [];
        iCur.push(person);
        existingByIdentity.set(iKey, iCur);
      }

      // Deduplicate import rows that share the same window key (keep the last)
      const dedupedImportByWindow = new Map<string, any>();
      for (const row of rows) {
        dedupedImportByWindow.set(normalizePersonWindowKey(row), row);
      }
      const importRows = Array.from(dedupedImportByWindow.values());

      const updateRows: any[] = [];
      const inserts: any[] = [];
      const matchedExistingIds = new Set<string>();
      // Track which identities are present in the import — used to decide what to delete
      const importedIdentities = new Set<string>();
      // For each identity in import, pick a canonical id to inherit orphaned time entries
      const canonicalIdByIdentity = new Map<string, string>();

      for (const row of importRows) {
        const identity = normalizePersonIdentity(row);
        importedIdentities.add(identity);

        const wKey = normalizePersonWindowKey(row);
        const winMatches = existingByWindow.get(wKey) || [];

        if (winMatches.length > 0) {
          // Use the newest matching window as the target id
          const sorted = [...winMatches].sort((a, b) => b.created_at.localeCompare(a.created_at));
          const target = sorted[0];
          updateRows.push({ ...row, id: target.id });
          matchedExistingIds.add(target.id);
          if (!canonicalIdByIdentity.has(identity)) {
            canonicalIdByIdentity.set(identity, target.id);
          }
        } else {
          inserts.push(row);
        }
      }

      // Apply updates in batches (one row per id, safe for ON CONFLICT)
      for (let i = 0; i < updateRows.length; i += BATCH) {
        const { error } = await supabase
          .from("people")
          .upsert(updateRows.slice(i, i + BATCH), { onConflict: "id" });
        if (error) throw error;
      }

      // Insert new rows and capture their ids so later inserts in the same identity
      // can still receive re-linked time entries.
      for (let i = 0; i < inserts.length; i += BATCH) {
        const slice = inserts.slice(i, i + BATCH);
        const { data: inserted, error } = await supabase
          .from("people")
          .insert(slice)
          .select("id, code, name");
        if (error) throw error;
        for (const row of inserted || []) {
          const identity = normalizePersonIdentity(row);
          if (!canonicalIdByIdentity.has(identity)) {
            canonicalIdByIdentity.set(identity, row.id);
          }
        }
      }

      // Figure out which existing rows should be deleted:
      //   - Rows whose identity appears in the import but whose specific window is no longer
      //     present (stale employment windows).
      //   - Rows whose identity is not in the import at all (person fully removed).
      // Before deleting, re-link any time_entries / allocations to a canonical sibling row
      // (newest matching identity row from the import) so historical data is preserved.
      const idsToDelete: string[] = [];
      const relinkPlan = new Map<string, string[]>(); // canonicalId -> orphan ids

      for (const person of existingPeople) {
        if (matchedExistingIds.has(person.id)) continue;

        const identity = normalizePersonIdentity(person);
        const canonical = canonicalIdByIdentity.get(identity);

        if (canonical && canonical !== person.id) {
          // Identity still exists in import — relink its references to the canonical row
          const cur = relinkPlan.get(canonical) || [];
          cur.push(person.id);
          relinkPlan.set(canonical, cur);
        }
        // Either way, this stale row gets deleted
        idsToDelete.push(person.id);
      }

      // Re-link references + delete stale rows server-side in a single transaction.
      // (Per-person PATCH loops timed out for large datasets.)
      const mapping: Record<string, string[]> = {};
      for (const [canonicalId, orphanIds] of relinkPlan) {
        if (orphanIds.length > 0) mapping[canonicalId] = orphanIds;
      }

      let relinkedTimeEntries = 0;
      let relinkedAllocations = 0;
      let relinkedClientAlloc = 0;
      let deletedCount = 0;

      if (idsToDelete.length > 0 || Object.keys(mapping).length > 0) {
        // Chunk delete_ids to keep each RPC well under statement timeout.
        const CHUNK = 2000;
        // First call handles the mapping + first slice of deletes.
        let mappingSent = false;
        for (let i = 0; i < Math.max(idsToDelete.length, 1); i += CHUNK) {
          const slice = idsToDelete.slice(i, i + CHUNK);
          const { data, error } = await supabase.rpc("relink_and_delete_people", {
            mapping: mappingSent ? {} : mapping,
            delete_ids: slice,
          });
          if (error) throw error;
          mappingSent = true;
          const r = (data || {}) as {
            relinkedTimeEntries?: number;
            relinkedAllocations?: number;
            relinkedClientAlloc?: number;
            deletedCount?: number;
          };
          relinkedTimeEntries += r.relinkedTimeEntries || 0;
          relinkedAllocations += r.relinkedAllocations || 0;
          relinkedClientAlloc += r.relinkedClientAlloc || 0;
          deletedCount += r.deletedCount || 0;
          if (idsToDelete.length === 0) break;
        }
      }

      const fallbackRelink = await relinkTimeEntriesFromFallbacks();

      return {
        relinkedTimeEntries: relinkedTimeEntries + (fallbackRelink.relinkedPeople || 0),
        relinkedAllocations,
        relinkedClientAlloc,
        deletedCount,
      };

    },
    onSuccess: (result, rows) => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      setPasteData("");
      recordImport("people", rows.length, queryClient);
      const r = result as { relinkedTimeEntries: number; relinkedAllocations: number; relinkedClientAlloc: number; deletedCount: number };
      const extras: string[] = [];
      if (r.deletedCount > 0) extras.push(`${r.deletedCount} removed`);
      const relinked = r.relinkedTimeEntries + r.relinkedAllocations + r.relinkedClientAlloc;
      if (relinked > 0) extras.push(`${relinked} record(s) re-linked`);
      toast.success(`${rows.length} people imported${extras.length ? ` (${extras.join(", ")})` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = async () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (!lines.length) { toast.error("No data"); return; }

    // Build role map, auto-creating missing roles
    let roleMap = new Map(roles.map((r) => [normalizeRoleName(r.name), r.id]));

    // First pass: collect missing role names
    const missingRoles = new Set<string>();
    for (const line of lines) {
      const p = line.split("\t");
      const roleName = p[2]?.trim();
      if (!roleName) continue;

      const normalizedRole = normalizeRoleName(roleName);
      if (normalizedRole && !roleMap.has(normalizedRole)) {
        missingRoles.add(roleName);
      }
    }

    // Auto-create missing roles
    if (missingRoles.size > 0) {
      const newRoles = buildUniqueRoleUpserts(missingRoles);
      const { error } = await supabase.from("roles").upsert(newRoles, { onConflict: "name" });
      if (error) { toast.error(`Failed to create roles: ${error.message}`); return; }
      // Refresh role list
      const { data: allRoles } = await supabase.from("roles").select("id, name").order("name");
      roleMap = new Map((allRoles || []).map((r) => [normalizeRoleName(r.name), r.id]));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.info(`Auto-created ${newRoles.length} new role(s)`);
    }

    // Columns: Name, Code, Role, Type, Team, Status, UK %, US %, IMC %, Start Date, End Date, Overall Start, Overall End, Monthly Salary, Office
    const rows = lines.map((line) => {
      const p = line.split("\t");
      const name = p[0]?.trim();
      if (!name) return null;
      const code = p[1]?.trim() || null;
      const roleName = p[2]?.trim();
      const type = p[3]?.trim() || null;
      const team = p[4]?.trim() || null;
      const status = p[5]?.trim() || null;
      const ukPct = parseFloat(p[6]?.trim().replace('%', '') || "0") || 0;
      const usPct = parseFloat(p[7]?.trim().replace('%', '') || "0") || 0;
      const imcPct = parseFloat(p[8]?.trim().replace('%', '') || "0") || 0;
      const start = p[9]?.trim() || "";
      const end = p[10]?.trim() || "";
      const overallStart = p[11]?.trim() || "";
      const overallEnd = p[12]?.trim() || "";
      const monthlySalRaw = p[13]?.trim().replace(/[£$,]/g, "") || "";
      const offRaw = (p[14]?.trim() || "UK").toLowerCase();
      const office = ["us", "usa", "united states"].includes(offRaw) ? "US" : "UK";

      const roleId = roleName ? (roleMap.get(normalizeRoleName(roleName)) || null) : null;
      const monthlySalary = monthlySalRaw ? parseFloat(monthlySalRaw) || null : null;

      return {
        name,
        code,
        role_id: roleId,
        type,
        team,
        status,
        uk_percentage: ukPct,
        us_percentage: usPct,
        imc_percentage: imcPct,
        office,
        employment_start_date: parseDateSimple(start),
        employment_end_date: parseDateSimple(end),
        overall_start_date: parseDateSimple(overallStart),
        overall_end_date: parseDateSimple(overallEnd),
        monthly_salary: monthlySalary,
        annual_salary: monthlySalary ? monthlySalary * 12 : null,
      };
    });

    const valid = rows.filter(Boolean) as any[];
    if (!valid.length) { toast.error("No valid rows"); return; }

    importPeople.mutate(valid);
  };

  return (
    <ImportPanel
      title="Import People"
      description="Fully replaces existing people. Each row is treated as one employment-history window (matched by Code + Role + Start Date), so a person can appear on multiple rows. Stale windows are removed and their time entries are re-linked to the person's remaining rows."
      columns="Name, Code, Role, Type, Team, Status, UK %, US %, IMC %, Start Date, End Date, Overall Start, Overall End, Monthly Salary, Office"
      placeholder={"Jane Smith\tEMP001\tDesigner\tFTE\tCreative\tActive\t100%\t0%\t0%\t01/03/2024\t\t01/01/2020\t\t3750\tUK\nJohn Doe\tEMP002\tDeveloper\tFTE\tEngineering\tActive\t0%\t100%\t0%\t15/06/2023\t\t15/06/2023\t\t7500\tUS"}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importPeople.isPending}
      buttonLabel="Import People"
      warning="This will replace all existing people data."
      lastImported={lastImported}
    />
  );
};

// ─── Data Summary (Projects) Tab ────────────────────────────────────────

const ProjectsImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const importProjects = useMutation({
    mutationFn: async ({ projects: rows, monthlyRows }: { projects: any[]; monthlyRows: { opp_number: string; month_date: string; value: number }[] }) => {
      // Clear monthly revenue (will be re-inserted)
      await supabase.from("project_monthly_revenue" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const BATCH = 500;
      // Upsert projects by opportunity_number to preserve IDs and foreign key links
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from("projects").upsert(rows.slice(i, i + BATCH), { onConflict: "opportunity_number" });
        if (error) throw error;
      }

      // Insert monthly revenue rows
      const allNewProjects: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("projects").select("id, opportunity_number").range(from, from + 999);
        if (error) throw error;
        allNewProjects.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      const newCodeMap = new Map(
        allNewProjects.filter((p: any) => p.opportunity_number).map((p: any) => [p.opportunity_number!.toLowerCase(), p.id])
      );
      if (monthlyRows.length > 0) {
        const monthlyInserts = monthlyRows
          .map((mr) => {
            const pid = newCodeMap.get(mr.opp_number.toLowerCase());
            return pid ? { project_id: pid, month_date: mr.month_date, value: mr.value } : null;
          })
          .filter(Boolean) as any[];
        for (let i = 0; i < monthlyInserts.length; i += BATCH) {
          await supabase.from("project_monthly_revenue" as any).insert(monthlyInserts.slice(i, i + BATCH));
        }
      }

      return await relinkTimeEntriesFromFallbacks();
    },
    onSuccess: (result, { projects: rows }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project_hours"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      setPasteData("");
      recordImport("projects", rows.length, queryClient);
      const relinked = (result?.relinkedPeople || 0) + (result?.relinkedProjects || 0);
      toast.success(`${rows.length} projects imported${relinked > 0 ? ` (${relinked} timesheet row(s) re-linked)` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").map((l) => l.split("\t"));
    if (lines.length < 2) { toast.error("Need a header row and at least one data row"); return; }

    const headers = lines[0].map((h) => h.trim().toLowerCase());

    // Helper: find column index by keywords.
    // Order of preference for each key, in turn:
    //   1. exact header match
    //   2. substring match, excluding headers that end in "currency" (currency-label cols hold "EUR"/"GBP" text, not numbers)
    //   3. substring match including currency-label cols (last resort)
    const findCol = (...keys: string[]): number => {
      for (const k of keys) {
        const exact = headers.indexOf(k);
        if (exact !== -1) return exact;
        const safe = headers.findIndex((h) => h.includes(k) && !h.endsWith("currency"));
        if (safe !== -1) return safe;
        const loose = headers.findIndex((h) => h.includes(k));
        if (loose !== -1) return loose;
      }
      return -1;
    };

    // Map structured columns
    const col = {
      title: findCol("opportunity name"),
      sf_account: findCol("sf account"),
      parent_account: findCol("parent account"),
      ultimate_parent: findCol("ultimate parent"),
      office: findCol("uk/us"),
      new_repeat: findCol("new/repeat"),
      stage: findCol("stage"),
      created_date: findCol("created date"),
      close_date: findCol("close date"),
      start_date: findCol("project start date"),
      end_date: findCol("project end date"),
      price: findCol("price gbp/usd", "price gbp", "total price", "price"),
      budget_cost: findCol("budget cost"),
      contracted_infl_cost: findCol("contracted infl cost"),
      actual_cost: findCol("actual cost"),
      media_cost: findCol("media cost", "cost - paid media budget"),
      gp_full_value: findCol("gp full value"),
      gp_check: findCol("gp check"),
      gp_full_value_per_day: findCol("gp full value per day"),
      probability: findCol("probability"),
      start_week: findCol("start week"),
      end_week: findCol("end week"),
      duration_weeks: findCol("duration (weeks)"),
      duration_weeks_rounded: findCol("duration (weeks - rounded)"),
      phase1_start: findCol("phase 1 start"),
      phase2_start: findCol("phase 2 start"),
      phase3_start: findCol("phase 3 start"),
      phase4_start: findCol("phase 4 start"),
      phase1_end: findCol("phase 1 end"),
      phase2_end: findCol("phase 2 end"),
      phase3_end: findCol("phase 3 end"),
      phase4_end: findCol("phase 4 end"),
      phase1_name: headers.indexOf("phase 1") !== -1 ? headers.indexOf("phase 1") : findCol("phase 1"),
      phase2_name: headers.indexOf("phase 2") !== -1 ? headers.indexOf("phase 2") : findCol("phase 2"),
      phase3_name: headers.indexOf("phase 3") !== -1 ? headers.indexOf("phase 3") : findCol("phase 3"),
      phase4_name: headers.indexOf("phase 4") !== -1 ? headers.indexOf("phase 4") : findCol("phase 4"),
      value_per_week_phase1: findCol("value per week - phase 1"),
      value_per_week_phase2: findCol("value per week - phase 2"),
      value_per_week_phase3: findCol("value per week - phase 3"),
      value_per_week_phase4: findCol("value per week - phase 4"),
      opportunity_owner: findCol("opportunity owner"),
      deal_value_derisked: findCol("deal value de-risked"),
      lead_source: findCol("lead source"),
      gp_margin_pct: findCol("gp margin"),
      industry: findCol("industry"),
      hub: findCol("hub"),
      opp_number: findCol("opp number"),
      opportunity_record_type: findCol("opportunity record type"),
      revenue: findCol("price gbp/usd", "price gbp", "total price", "price"),
      total_fees: findCol("total fees"),
      infl_production_costs: findCol("infl. + production", "infl"),
      paid_media_fees: findCol("paid media fees"),
      gross_budget: findCol("gross budget full value (gbp / usd)", "gross budget full value (gbp/usd)", "gross budget full value gbp", "gross budget full value usd", "gross budget full value", "gross budget"),
      hard_costs: findCol("hard costs"),
      bdb_hours: findCol("bdb hours"),
      original_lead_source: findCol("original lead source"),
    };

    if (col.title === -1) { toast.error("Could not find 'Opportunity Name' column"); return; }
    if (col.start_date === -1 || col.end_date === -1) { toast.error("Could not find start/end date columns"); return; }

    // Detect monthly date columns (dd/mm/yyyy pattern in header)
    const monthCols: { idx: number; date: string }[] = [];
    headers.forEach((h, idx) => {
      const m = h.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        const parsed = tryParseDate(lines[0][idx].trim());
        if (parsed) monthCols.push({ idx, date: parsed });
      }
    });

    const getStr = (cells: string[], idx: number) => idx >= 0 ? (cells[idx]?.trim() || null) : null;
    const getNum = (cells: string[], idx: number) => {
      if (idx < 0) return null;
      const raw = cells[idx]?.trim().replace(/[£$,%]/g, "").replace(/,/g, "") || "";
      const n = parseFloat(raw);
      return isNaN(n) ? null : n;
    };

    const projectRows: any[] = [];
    const monthlyRows: { opp_number: string; month_date: string; value: number }[] = [];
    const errors: string[] = [];

    // Collect all extra header names that aren't mapped to structured fields
    const mappedIndices = new Set(Object.values(col).filter((v) => v >= 0));
    monthCols.forEach((mc) => mappedIndices.add(mc.idx));

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      const titleVal = getStr(cells, col.title);
      if (!titleVal) continue;
      const startStr = tryParseDate(cells[col.start_date] || "");
      const endStr = tryParseDate(cells[col.end_date] || "");
      if (!startStr || !endStr) { errors.push(`Row ${i + 1} "${titleVal}": invalid dates`); continue; }

      const oppNumber = getStr(cells, col.opp_number);
      if (!oppNumber) continue; // Skip rows without opportunity number

      // Collect unmapped columns into extra_data
      const extra: Record<string, string> = {};
      cells.forEach((cell, idx) => {
        if (!mappedIndices.has(idx) && cell?.trim()) {
          extra[headers[idx] || `col_${idx}`] = cell.trim();
        }
      });

      projectRows.push({
        title: titleVal,
        start_date: startStr,
        end_date: endStr,
        opportunity_number: oppNumber,
        sf_account: getStr(cells, col.sf_account),
        parent_account: getStr(cells, col.parent_account),
        ultimate_parent: getStr(cells, col.ultimate_parent),
        stage: getStr(cells, col.stage),
        office: getStr(cells, col.office),
        opportunity_record_type: getStr(cells, col.opportunity_record_type),
        revenue: getNum(cells, col.revenue) || getNum(cells, col.total_fees) || 0,
        new_repeat: getStr(cells, col.new_repeat),
        created_date: tryParseDate(cells[col.created_date] || ""),
        close_date: tryParseDate(cells[col.close_date] || ""),
        price: getNum(cells, col.price),
        budget_cost: getNum(cells, col.budget_cost),
        contracted_infl_cost: getNum(cells, col.contracted_infl_cost),
        actual_cost: getNum(cells, col.actual_cost),
        media_cost: getNum(cells, col.media_cost),
        gp_full_value: getNum(cells, col.gp_full_value),
        gp_check: getStr(cells, col.gp_check),
        gp_full_value_per_day: getNum(cells, col.gp_full_value_per_day),
        probability: getNum(cells, col.probability),
        start_week: getStr(cells, col.start_week),
        end_week: getStr(cells, col.end_week),
        duration_weeks: getNum(cells, col.duration_weeks),
        duration_weeks_rounded: getNum(cells, col.duration_weeks_rounded),
        phase1_start: tryParseDate(cells[col.phase1_start] || ""),
        phase2_start: tryParseDate(cells[col.phase2_start] || ""),
        phase3_start: tryParseDate(cells[col.phase3_start] || ""),
        phase4_start: tryParseDate(cells[col.phase4_start] || ""),
        phase1_end: tryParseDate(cells[col.phase1_end] || ""),
        phase2_end: tryParseDate(cells[col.phase2_end] || ""),
        phase3_end: tryParseDate(cells[col.phase3_end] || ""),
        phase4_end: tryParseDate(cells[col.phase4_end] || ""),
        phase1_name: getStr(cells, col.phase1_name),
        phase2_name: getStr(cells, col.phase2_name),
        phase3_name: getStr(cells, col.phase3_name),
        phase4_name: getStr(cells, col.phase4_name),
        value_per_week_phase1: getNum(cells, col.value_per_week_phase1),
        value_per_week_phase2: getNum(cells, col.value_per_week_phase2),
        value_per_week_phase3: getNum(cells, col.value_per_week_phase3),
        value_per_week_phase4: getNum(cells, col.value_per_week_phase4),
        opportunity_owner: getStr(cells, col.opportunity_owner),
        deal_value_derisked: getNum(cells, col.deal_value_derisked),
        lead_source: getStr(cells, col.lead_source),
        gp_margin_pct: getNum(cells, col.gp_margin_pct),
        industry: getStr(cells, col.industry),
        hub: getStr(cells, col.hub),
        total_fees: getNum(cells, col.total_fees),
        infl_production_costs: getNum(cells, col.infl_production_costs),
        paid_media_fees: getNum(cells, col.paid_media_fees),
        gross_budget: getNum(cells, col.gross_budget),
        hard_costs: getNum(cells, col.hard_costs),
        bdb_hours: getNum(cells, col.bdb_hours),
        original_lead_source: getStr(cells, col.original_lead_source),
        extra_data: Object.keys(extra).length > 0 ? extra : null,
      });

      // Monthly revenue
      if (oppNumber) {
        for (const mc of monthCols) {
          const val = getNum(cells, mc.idx);
          if (val && val !== 0) {
            monthlyRows.push({ opp_number: oppNumber, month_date: mc.date, value: val });
          }
        }
      }
    }

    if (!projectRows.length) { toast.error("No valid projects"); return; }
    importProjects.mutate({ projects: projectRows, monthlyRows });
  };

  return (
    <ImportPanel
      title="Import Data Summary"
      description="Import the full Data Summary sheet including financials, phases, and monthly revenue. Uses header row to auto-detect all columns."
      columns="Opportunity Name, SF Account, Stage, Start/End Dates, GP, Phases, Monthly Revenue columns, and more"
      placeholder={"Paste all columns including the header row from your Data Summary sheet."}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importProjects.isPending}
      buttonLabel="Import Data Summary"
      warning="This will replace all existing project data."
      lastImported={lastImported}
    />
  );
};

// ─── Briefs per Month Tab ────────────────────────────────────────────────

const LostProjectsImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const importBriefs = useMutation({
    mutationFn: async (rows: any[]) => {
      const BATCH = 500;
      // Upsert by opportunity_number to preserve IDs and avoid duplicates
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from("projects").upsert(rows.slice(i, i + BATCH), { onConflict: "opportunity_number" });
        if (error) throw error;
      }

      return await relinkTimeEntriesFromFallbacks();
    },
    onSuccess: (result, rows) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      setPasteData("");
      recordImport("lost_projects", rows.length, queryClient);
      const relinked = (result?.relinkedPeople || 0) + (result?.relinkedProjects || 0);
      toast.success(`${rows.length} briefs imported${relinked > 0 ? ` (${relinked} timesheet row(s) re-linked)` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").map((l) => l.split("\t"));
    if (lines.length < 2) { toast.error("Need a header row and at least one data row"); return; }

    const headers = lines[0].map((h) => h.trim().toLowerCase());
    // Prefer exact match, then substring excluding currency-label cols, then loose substring
    const findCol = (...keys: string[]): number => {
      for (const k of keys) {
        const exact = headers.indexOf(k);
        if (exact !== -1) return exact;
        const safe = headers.findIndex((h) => h.includes(k) && !h.endsWith("currency"));
        if (safe !== -1) return safe;
        const loose = headers.findIndex((h) => h.includes(k));
        if (loose !== -1) return loose;
      }
      return -1;
    };

    const col = {
      account_name: findCol("account name"),
      parent_account: findCol("parent account"),
      title: findCol("opportunity name"),
      opp_number: findCol("opportunity number"),
      opportunity_owner: findCol("opportunity owner"),
      stage: findCol("stage"),
      total_price_currency: findCol("total price currency"),
      total_price: findCol("total price"),
      close_date: findCol("close date"),
      created_date: findCol("created date"),
      lead_source: findCol("lead source"),
      type: headers.indexOf("type") !== -1 ? headers.indexOf("type") : findCol("type"),
      start_date: findCol("project start date"),
      end_date: findCol("project end date"),
      probability: findCol("probability"),
      office: findCol("office"),
      total_price_converted_currency: findCol("total price (converted) currency"),
      total_price_converted: findCol("total price (converted)"),
      cost_net_budget_converted_currency: findCol("cost - net budget (converted) currency"),
      cost_net_budget_converted: findCol("cost - net budget (converted)"),
      cost_actual_invoiced_converted_currency: findCol("cost - actual invoiced (converted) currency"),
      cost_actual_invoiced_converted: findCol("cost - actual invoiced (converted)"),
      cost_influencers_converted_currency: findCol("cost - influencers (converted) currency"),
      cost_influencers_converted: findCol("cost - influencers (converted)"),
      cost_paid_media_converted_currency: findCol("cost - paid media budget (converted) currency"),
      cost_paid_media_converted: findCol("cost - paid media budget (converted)"),
      content_live_date: findCol("content live date"),
      content_end_date: findCol("content end date"),
      gp_converted_currency: findCol("gross profit (converted) currency"),
      gp_converted: findCol("gross profit (converted)"),
      cost_running_estimate_converted_currency: findCol("cost - running estimate (converted) currency"),
      cost_running_estimate_converted: findCol("cost - running estimate (converted)"),
      cost_net_budget_currency: findCol("cost - net budget currency"),
      cost_net_budget: findCol("cost - net budget"),
      cost_influencers_currency: findCol("cost - influencers currency"),
      cost_influencers: findCol("cost - influencers"),
      cost_actual_invoiced_currency: findCol("cost - actual invoiced currency"),
      cost_actual_invoiced: findCol("cost - actual invoiced"),
      cost_paid_media_currency: findCol("cost - paid media budget currency"),
      cost_paid_media: findCol("cost - paid media budget"),
      ultimate_parent: findCol("ultimate parent"),
      opportunity_record_type: findCol("opportunity record type"),
    };

    if (col.title === -1) { toast.error("Could not find 'Opportunity Name' column"); return; }

    const getStr = (cells: string[], idx: number) => idx >= 0 ? (cells[idx]?.trim() || null) : null;
    const getNum = (cells: string[], idx: number) => {
      if (idx < 0) return null;
      const raw = cells[idx]?.trim().replace(/[£$,%]/g, "").replace(/,/g, "") || "";
      const n = parseFloat(raw);
      return isNaN(n) ? null : n;
    };

    const rows: any[] = [];
    const errors: string[] = [];
    const mappedIndices = new Set(Object.values(col).filter((v) => v >= 0));

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      const titleVal = getStr(cells, col.title);
      if (!titleVal) continue;
      const oppNumber = getStr(cells, col.opp_number);
      if (!oppNumber) continue; // Skip rows without opportunity number

      // Start/end dates are optional for briefs
      const startStr = tryParseDate(cells[col.start_date] || "") || tryParseDate(cells[col.created_date] || "");
      const endStr = tryParseDate(cells[col.end_date] || "") || tryParseDate(cells[col.close_date] || "");
      if (!startStr || !endStr) { errors.push(`Row ${i + 1} "${titleVal}": no valid dates`); continue; }

      // Collect unmapped columns into extra_data
      const extra: Record<string, string> = {};
      cells.forEach((cell, idx) => {
        if (!mappedIndices.has(idx) && cell?.trim()) {
          extra[headers[idx] || `col_${idx}`] = cell.trim();
        }
      });

      const totalPriceNum = getNum(cells, col.total_price);
      const row: Record<string, any> = {
        title: titleVal,
        start_date: startStr,
        end_date: endStr,
        opportunity_number: getStr(cells, col.opp_number),
        sf_account: getStr(cells, col.account_name),
        parent_account: getStr(cells, col.parent_account),
        ultimate_parent: getStr(cells, col.ultimate_parent),
        stage: getStr(cells, col.stage) || "Brief",
        office: getStr(cells, col.office),
        opportunity_record_type: getStr(cells, col.opportunity_record_type),
        opportunity_owner: getStr(cells, col.opportunity_owner),
        lead_source: getStr(cells, col.lead_source),
        original_lead_source: getStr(cells, col.lead_source),
        probability: getNum(cells, col.probability),
        created_date: tryParseDate(cells[col.created_date] || ""),
        close_date: tryParseDate(cells[col.close_date] || ""),
        gp_full_value: getNum(cells, col.gp_converted),
        budget_cost: getNum(cells, col.cost_net_budget_converted),
        actual_cost: getNum(cells, col.cost_actual_invoiced_converted),
        media_cost: getNum(cells, col.cost_paid_media_converted) ?? getNum(cells, col.cost_paid_media),
        contracted_infl_cost: getNum(cells, col.cost_influencers_converted) ?? getNum(cells, col.cost_influencers),
        fee_calc_currency: getStr(cells, col.total_price_currency),
        gross_budget: getNum(cells, col.cost_net_budget_converted) ?? getNum(cells, col.cost_net_budget),
        extra_data: Object.keys(extra).length > 0 ? extra : null,
      };
      // Only set revenue/price if we parsed a real positive number — never overwrite
      // an existing value (e.g. set by the Data Summary import) with 0.
      if (totalPriceNum != null && totalPriceNum > 0) {
        row.revenue = totalPriceNum;
        row.price = totalPriceNum;
      }
      rows.push(row);
    }

    
    if (!rows.length) { toast.error("No valid briefs"); return; }
    importBriefs.mutate(rows);
  };

  return (
    <ImportPanel
      title="Import Briefs per Month"
      description="Import briefs/pipeline data. Rows are upserted by Opportunity Number — matching projects are updated, new ones are added, and existing projects not in the upload are kept unchanged. Uses header row to auto-detect columns."
      columns="Account Name, Opportunity Name, Opportunity Number, Stage, Dates, Costs, GP, and more"
      placeholder={"Paste all columns including the header row from your Briefs per Month sheet."}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importBriefs.isPending}
      buttonLabel="Import Briefs"
      lastImported={lastImported}
    />
  );
};

// ─── Timesheets Tab ─────────────────────────────────────────────────────

const TimesheetsImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");
  const [overwriteFrom, setOverwriteFrom] = useState("");

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const all: { id: string; name: string }[] = [];
      let offset = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase.from("people").select("id, name").order("name").range(offset, offset + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        offset += BATCH;
      }
      return all;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const all: { id: string; title: string; opportunity_number: string | null }[] = [];
      let offset = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase.from("projects").select("id, title, opportunity_number").order("title").range(offset, offset + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        offset += BATCH;
      }
      return all;
    },
  });

  const importEntries = useMutation({
    mutationFn: async ({ rows, fromDate }: { rows: any[]; fromDate: string | null }) => {
      const { error: delErr } = await (supabase as any).rpc("delete_time_entries_for_import", { _from_date: fromDate });
      if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

      // Round hours to 2 decimal places to avoid numeric precision issues
      const sanitised = rows.map(r => ({ ...r, hours: Math.round(r.hours * 100) / 100 }));
      const BATCH = 500;
      for (let i = 0; i < sanitised.length; i += BATCH) {
        const batch = sanitised.slice(i, i + BATCH);
        const { error } = await supabase.from("time_entries").insert(batch);
        if (error) {
          const batchNum = Math.floor(i / BATCH) + 1;
          const totalBatches = Math.ceil(sanitised.length / BATCH);
          console.error(`Batch ${batchNum}/${totalBatches} failed. Sample row:`, JSON.stringify(batch[0]));
          throw new Error(`Batch ${batchNum}/${totalBatches}: ${error.message}`);
        }
      }
    },
    onSuccess: (_, { rows }) => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_utilisation"] });
      queryClient.invalidateQueries({ queryKey: ["utilisation_summary"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_for_classification"] });
      setPasteData("");
      recordImport("timesheets", rows.length, queryClient);
      toast.success(`${rows.length} time entries imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parseDate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (!isNaN(date.getTime())) return format(date, "yyyy-MM-dd");
    }
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return trimmed;
    return null;
  };

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (!lines.length) { toast.error("No data"); return; }

    // Log first 3 raw lines for debugging
    console.log("=== TIMESHEET IMPORT DEBUG ===");
    console.log(`Total lines: ${lines.length}`);
    for (let s = 0; s < Math.min(3, lines.length); s++) {
      const sample = lines[s].split("\t");
      console.log(`Line ${s + 1} (${sample.length} cols):`, sample);
    }

    const personMap = new Map(people.map((p) => [p.name.toLowerCase(), p.id]));
    const projectCodeMap = new Map(
      projects.filter((p) => p.opportunity_number).map((p) => [p.opportunity_number!.toLowerCase(), p.id])
    );

    const valid: any[] = [];
    const skipReasons = { tooFewCols: 0, badDate: 0, badHours: 0 };
    const sampleSkips: string[] = [];

    // Auto-detect column layout from header
    const firstCols = lines[0].split("\t").map(c => c.trim().toLowerCase());
    const hasHeader = firstCols[0] === "date";
    const startIdx = hasHeader ? 1 : 0;

    // Build column index map from header, with sensible defaults
    let colDate = 0, colClient = 1, colProject = 2, colCode = 3, colTask = 4, colNotes = -1, colHours = 5, colFirst = 6, colLast = 7;

    if (hasHeader) {
      const idx = (name: string) => firstCols.indexOf(name);
      if (idx("date") >= 0) colDate = idx("date");
      if (idx("client") >= 0) colClient = idx("client");
      if (idx("project") >= 0) colProject = idx("project");
      if (idx("project code") >= 0) colCode = idx("project code");
      if (idx("task") >= 0) colTask = idx("task");
      if (idx("notes") >= 0) colNotes = idx("notes");
      if (idx("hours") >= 0) colHours = idx("hours");
      if (idx("first name") >= 0) colFirst = idx("first name");
      if (idx("last name") >= 0) colLast = idx("last name");
      console.log("Column mapping:", { colDate, colProject, colCode, colTask, colNotes, colHours, colFirst, colLast });
    }

    const minCols = Math.max(colDate, colHours, colFirst, colLast) + 1;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      if (cols.length < minCols) {
        skipReasons.tooFewCols++;
        if (sampleSkips.length < 3) sampleSkips.push(`Row ${i + 1}: ${cols.length} cols (need ${minCols}) → "${lines[i].substring(0, 120)}"`);
        continue;
      }

      const dateRaw = cols[colDate];
      const projectName = cols[colProject] || "";
      const projectCode = cols[colCode] || "";
      const task = cols[colTask] || "";
      const notes = colNotes >= 0 ? (cols[colNotes] || "") : task;
      const hoursRaw = cols[colHours] || "";
      const firstName = cols[colFirst] || "";
      const lastName = cols[colLast] || "";

      const parsedDate = parseDate(dateRaw);
      if (!parsedDate) {
        skipReasons.badDate++;
        if (sampleSkips.length < 3) sampleSkips.push(`Row ${i + 1}: bad date "${dateRaw}"`);
        continue;
      }
      const hours = parseFloat(hoursRaw.replace(/,/g, ""));
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        skipReasons.badHours++;
        if (sampleSkips.length < 3) sampleSkips.push(`Row ${i + 1}: bad hours "${hoursRaw}"`);
        continue;
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim().toLowerCase();
      const personId = fullName ? (personMap.get(fullName) || null) : null;
      const code = projectCode.trim();
      const projectId = code ? (projectCodeMap.get(code.toLowerCase()) || null) : null;
      valid.push({
        person_id: personId,
        person_name: fullName || null,
        project_id: projectId,
        project_code: code || null,
        date: parsedDate,
        hours,
        notes: (notes || task).trim() || null,
        project_name: projectName.trim() || null,
      });
    }

    const totalSkipped = skipReasons.tooFewCols + skipReasons.badDate + skipReasons.badHours;
    if (totalSkipped > 0) {
      const parts = [];
      if (skipReasons.tooFewCols) parts.push(`${skipReasons.tooFewCols} wrong column count`);
      if (skipReasons.badDate) parts.push(`${skipReasons.badDate} bad dates`);
      if (skipReasons.badHours) parts.push(`${skipReasons.badHours} bad hours`);
      console.warn("Skip reasons:", skipReasons);
      console.warn("Sample skips:", sampleSkips);
      toast.warning(`${totalSkipped} rows skipped: ${parts.join(", ")}`, { duration: 10000 });
    }

    if (!valid.length) { toast.error("No valid rows"); return; }
    importEntries.mutate({ rows: valid, fromDate: overwriteFrom || null });
  };

  const overwriteLabel = overwriteFrom
    ? `Import & overwrite from ${format(new Date(overwriteFrom), "d MMM yyyy")}`
    : "Import Timesheets (replace all)";

  const warningText = overwriteFrom
    ? `This will delete all timesheet entries from ${format(new Date(overwriteFrom), "d MMM yyyy")} onwards and replace them with the pasted data. Entries before that date will not be affected.`
    : "This will replace all existing timesheet data.";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-display">Import Timesheets</CardTitle>
            <CardDescription>Import timesheet data. Optionally set a date to only overwrite entries from that date onwards.</CardDescription>
          </div>
          {lastImported && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md shrink-0">
              <Clock className="h-3 w-3" />
              <span>
                Last import: {formatDistanceToNow(new Date(lastImported.last_imported_at), { addSuffix: true })}
                {" · "}{lastImported.row_count} rows
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy rows from Google Sheets with columns: <strong>Date, Client, Project, Project Code, Task, [Notes], Hours, First Name, Last Name, [Roles]</strong> — and paste below. The Notes column is optional and auto-detected.
        </p>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Overwrite from date <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="date"
              value={overwriteFrom}
              onChange={(e) => setOverwriteFrom(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          {overwriteFrom && (
            <Button variant="ghost" size="sm" onClick={() => setOverwriteFrom("")} className="text-muted-foreground">
              Clear (replace all)
            </Button>
          )}
        </div>
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{warningText}</span>
        </div>
        <Textarea
          rows={10}
          placeholder={"01/03/2025\tAcme Corp\tBrand Campaign\tOP-12345\tDesign work\t3.5\tJane\tSmith\tDesigner"}
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          className="font-mono text-xs"
        />
        <Button onClick={handleImport} disabled={!pasteData.trim() || importEntries.isPending} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          {importEntries.isPending ? "Importing..." : overwriteLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Scopes Tab ─────────────────────────────────────────────────────────

const ScopesImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_scope_import_all"],
    queryFn: async () => {
      const all: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, opportunity_number")
          .order("title")
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
        offset += pageSize;
      }
      return all;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const importScopes = useMutation({
    mutationFn: async (rows: { project_id: string; role_id: string; scoped_hours: number; phase_hours: Record<string, number> }[]) => {
      // Only clear project_scopes — ON DELETE SET NULL handles dependents
      await supabase.from("project_scopes").delete().not("id", "is", null);

      // Insert scopes with phase_percentages
      const scopeInserts = rows.map(({ project_id, role_id, scoped_hours, phase_hours }) => ({
        project_id,
        role_id,
        scoped_hours,
        phase_percentages: Object.keys(phase_hours).length > 0 ? phase_hours : {},
      }));
      const BATCH = 500;
      for (let i = 0; i < scopeInserts.length; i += BATCH) {
        const { error } = await supabase.from("project_scopes").insert(scopeInserts.slice(i, i + BATCH) as any);
        if (error) throw error;
      }

      // Now link phase allocations if phases exist
      // Get newly created scopes to map back
      const allNewScopes: any[] = [];
      let scopeFrom = 0;
      while (true) {
        const { data, error } = await supabase.from("project_scopes").select("id, project_id, role_id").range(scopeFrom, scopeFrom + 999);
        if (error) throw error;
        allNewScopes.push(...(data || []));
        if (!data || data.length < 1000) break;
        scopeFrom += 1000;
      }
      const scopeMap = new Map(allNewScopes.map((s) => [`${s.project_id}|${s.role_id}`, s.id]));

      // Get phases for all affected projects
      const { data: allPhases } = await supabase.from("project_phases").select("id, project_id, phase_name, sort_order");
      const phasesByProject = new Map<string, typeof allPhases>();
      (allPhases || []).forEach((p) => {
        const list = phasesByProject.get(p.project_id) || [];
        list.push(p);
        phasesByProject.set(p.project_id, list);
      });

      const phaseAllocInserts: { phase_id: string; project_scope_id: string; hours: number }[] = [];
      for (const row of rows) {
        const scopeId = scopeMap.get(`${row.project_id}|${row.role_id}`);
        if (!scopeId) continue;
        const phases = phasesByProject.get(row.project_id) || [];
        for (const [phaseName, hours] of Object.entries(row.phase_hours)) {
          if (hours <= 0) continue;
          // Match by phase name or sort order
          const phaseNum = parseInt(phaseName.replace(/\D/g, ""));
          const phase = phases.find((p) => p.sort_order === phaseNum || p.phase_name.toLowerCase() === phaseName.toLowerCase());
          if (phase) {
            phaseAllocInserts.push({ phase_id: phase.id, project_scope_id: scopeId, hours });
          }
        }
      }

      if (phaseAllocInserts.length > 0) {
        for (let i = 0; i < phaseAllocInserts.length; i += BATCH) {
          await supabase.from("phase_allocations").insert(phaseAllocInserts.slice(i, i + BATCH));
        }
      }
    },
    onSuccess: (_, rows) => {
      const withPhases = rows.filter((r) => Object.keys(r.phase_hours).length > 0).length;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project_scopes"] });
      queryClient.invalidateQueries({ queryKey: ["phase_allocations"] });
      setPasteData("");
      recordImport("scopes", rows.length, queryClient);
      toast.success(`${rows.length} scoped hours imported (${withPhases} with phase data)`, { duration: 15000 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = async () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (!lines.length) { toast.error("No data"); return; }

    const firstCols = lines[0].split("\t");
    const hdrs = firstCols.map((h) => h.trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase());
    const isHeader = ["opp", "opportunity", "number", "office", "role", "phase"].some((k) => hdrs.some((h) => h.includes(k)));
    const startIdx = isHeader ? 1 : 0;

    // Auto-detect columns
    let oppCol = 0, roleCol = 3, hoursCol = 4;
    let singlePhaseCol = -1;
    const phaseCols: { idx: number; name: string }[] = [];

    if (isHeader) {
      const oppIdx = hdrs.findIndex((h) => h.includes("opp") && h.includes("number"));
      const roleIdx = hdrs.findIndex((h) => h === "role" || h === "roles");
      const hoursIdx = hdrs.findIndex((h) => h === "hours" || h.includes("scoped"));
      if (oppIdx !== -1) oppCol = oppIdx;
      if (roleIdx !== -1) roleCol = roleIdx;
      if (hoursIdx !== -1) hoursCol = hoursIdx;

      // Detect phase columns - either separate "Phase 1", "Phase 2"... or a single "phase" header spanning 12 columns
      hdrs.forEach((h, idx) => {
        const phaseMatch = h.match(/phase\s*(\d+)/);
        if (phaseMatch) {
          phaseCols.push({ idx, name: `Phase ${phaseMatch[1]}` });
        } else if (h === "phase" || h === "phases") {
          singlePhaseCol = idx;
        }
      });

      // If we found a single "phase" header but no numbered phase columns,
      // check if data rows have 12 additional columns after it (merged header for Phase 1-12)
      if (phaseCols.length === 0 && singlePhaseCol !== -1 && lines.length > startIdx) {
        const sampleCols = lines[startIdx].split("\t");
        // Check if there are up to 12 columns of numeric data starting at singlePhaseCol
        const possiblePhases = sampleCols.length - singlePhaseCol;
        if (possiblePhases >= 2) {
          const phaseCount = Math.min(possiblePhases, 12);
          for (let p = 0; p < phaseCount; p++) {
            phaseCols.push({ idx: singlePhaseCol + p, name: `Phase ${p + 1}` });
          }
          singlePhaseCol = -1; // Use phaseCols instead
          console.log(`Scope import: detected ${phaseCount} phase columns from merged header starting at col ${phaseCols[0].idx}`);
        }
      }
      console.log("Scope import: detected headers=", hdrs, "phaseCols=", phaseCols.length, "singlePhaseCol=", singlePhaseCol);
    }

    const projectCodeMap = new Map(
      projects.filter((p) => p.opportunity_number).map((p) => [p.opportunity_number!.toLowerCase().trim(), p.id])
    );

    // Auto-create missing roles
    let roleMap = new Map(roles.map((r) => [normalizeRoleName(r.name), r.id]));
    const missingRoles = new Set<string>();
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      const roleName = cleanStr(cols[roleCol] || "");
      const normalizedRole = normalizeRoleName(roleName);
      if (normalizedRole && !roleMap.has(normalizedRole)) {
        missingRoles.add(roleName);
      }
    }
    if (missingRoles.size > 0) {
      const newRoles = buildUniqueRoleUpserts(missingRoles);
      const { error } = await supabase.from("roles").upsert(newRoles, { onConflict: "name" });
      if (error) { toast.error(`Failed to create roles: ${error.message}`); return; }
      const { data: allRoles } = await supabase.from("roles").select("id, name").order("name");
      roleMap = new Map((allRoles || []).map((r) => [normalizeRoleName(r.name), r.id]));
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.info(`Auto-created ${newRoles.length} new role(s)`);
    }

    // Aggregate rows by project+role: sum hours, collect per-phase hours
    const aggregateMap = new Map<string, { project_id: string; role_id: string; totalHours: number; phaseHours: Record<string, number> }>();
    const errors: string[] = [];

    // Track row occurrence per project+role to determine phase number
    const phaseCounter = new Map<string, number>();

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      const oppNumber = cleanStr(cols[oppCol] || "");
      const roleName = cleanStr(cols[roleCol] || "");
      const hours = parseFloat(cleanStr(cols[hoursCol] || ""));
      if (isNaN(hours) || hours <= 0) continue;
      if (!oppNumber) { errors.push(`Row ${i + 1}: missing opp number`); continue; }
      const projectId = projectCodeMap.get(oppNumber.toLowerCase());
      if (!projectId) { errors.push(`Row ${i + 1}: project "${oppNumber}" not found`); continue; }
      if (!roleName) { errors.push(`Row ${i + 1}: missing role`); continue; }
      const roleId = roleMap.get(roleName.toLowerCase());
      if (!roleId) { errors.push(`Row ${i + 1}: role "${roleName}" not found`); continue; }

      const key = `${projectId}|${roleId}`;
      const existing = aggregateMap.get(key) || { project_id: projectId, role_id: roleId, totalHours: 0, phaseHours: {} };
      existing.totalHours += hours;

      // Determine phase assignment
      if (phaseCols.length > 0) {
        // Separate columns for each phase — phase cols have percentages, convert to absolute hours
        for (const pc of phaseCols) {
          const val = parseFloat(cleanStr(cols[pc.idx] || "").replace(/["%]/g, ''));
          if (!isNaN(val) && val > 0) {
            existing.phaseHours[pc.name] = (existing.phaseHours[pc.name] || 0) + (val / 100) * hours;
          }
        }
      } else if (singlePhaseCol !== -1) {
        const rawPhase = cleanStr(cols[singlePhaseCol] || "");
        const phaseNameMatch = rawPhase.match(/phase\s*(\d+)/i);
        if (phaseNameMatch) {
          // Explicit phase name per row (e.g., "Phase 8")
          const normalizedName = `Phase ${phaseNameMatch[1]}`;
          existing.phaseHours[normalizedName] = (existing.phaseHours[normalizedName] || 0) + hours;
        } else {
          // Single percentage per row — each row is the next sequential phase for this project+role
          const pct = parseFloat(rawPhase.replace(/["%\s]/g, ''));
          const occurrence = (phaseCounter.get(key) || 0) + 1;
          phaseCounter.set(key, occurrence);
          if (!isNaN(pct) && pct > 0) {
            const pName = `Phase ${occurrence}`;
            existing.phaseHours[pName] = (existing.phaseHours[pName] || 0) + hours;
          }
        }
      }

      aggregateMap.set(key, existing);
    }

    // Convert aggregated data to final format with phase percentages
    const valid = Array.from(aggregateMap.values()).map(({ project_id, role_id, totalHours, phaseHours }) => {
      // Convert absolute phase hours to percentages of total
      const phase_hours: Record<string, number> = {};
      for (const [phaseName, phaseH] of Object.entries(phaseHours)) {
        if (totalHours > 0) {
          phase_hours[phaseName] = (phaseH / totalHours) * 100;
        }
      }
      return { project_id, role_id, scoped_hours: totalHours, phase_hours };
    });

    if (errors.length > 0) {
      console.warn("Scope import errors:", errors);
      const preview = errors.slice(0, 10).join("\n");
      const more = errors.length > 10 ? `\n...and ${errors.length - 10} more` : "";
      toast.warning(`${errors.length} row(s) had issues:\n${preview}${more}`, { duration: 15000 });
    }

    console.log("Scope import: oppCol=", oppCol, "roleCol=", roleCol, "hoursCol=", hoursCol, "headers=", hdrs);
    console.log("Scope import: projectCodeMap keys sample:", Array.from(projectCodeMap.keys()).slice(0, 10));
    console.log("Scope import: valid rows=", valid.length, "errors=", errors.length);
    
    if (!valid.length) { toast.error("No valid rows to import"); return; }
    const withPhases = valid.filter((r) => Object.keys(r.phase_hours).length > 0).length;
    toast.info(`Importing ${valid.length} scopes (${withPhases} with phase data)`, { duration: 15000 });
    importScopes.mutate(valid);
  };

  return (
    <ImportPanel
      title="Import Scoped Hours"
      description="Import role-based scoped hours per project with phase breakdowns. Previous scopes for affected projects will be replaced."
      columns="Opp Number, Office, Opportunity, Role, Hours, Phase 1–12"
      placeholder={"Opp Number\tOffice\tOpportunity\tRole\tHours\tPhase 1\tPhase 2\tPhase 3\tPhase 4\n12345\tUK\tAcme Rebrand\tDesigner\t120\t40\t40\t40\t0"}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importScopes.isPending}
      buttonLabel="Import Scoped Hours"
      lastImported={lastImported}
    />
  );
};

// ─── UK Rate Cards Tab ──────────────────────────────────────────────────

const RateCardsImportTab = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [pasteData, setPasteData] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const importRateCards = useMutation({
    mutationFn: async (rows: { name: string; role_id: string; hourly_rate: number; currency: string }[]) => {
      // Clear existing rate cards and re-insert
      await supabase.from("rate_cards").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from("rate_cards").insert(rows.slice(i, i + BATCH));
        if (error) throw error;
      }
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["rate-cards"] });
      setPasteData("");
      recordImport("rate_cards", rows.length, queryClient);
      toast.success(`${rows.length} rate card entries imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (lines.length < 3) {
      toast.error("Need at least 3 rows: client names, currencies, and one role row");
      return;
    }

    const roleMap = new Map(roles.map((r) => [r.name.toLowerCase().trim(), r.id]));

    // Row 1: "Role" + client names
    const row1 = lines[0].split("\t");
    const clientNames = row1.slice(1).map((c) => c.trim()).filter(Boolean);

    // Row 2: "FX Rate" / "Currency" + currency codes
    const row2 = lines[1].split("\t");
    const currencies = row2.slice(1).map((c) => {
      const v = c.trim().toUpperCase();
      if (v === "GBP" || v === "EUR" || v === "USD") return v;
      return "GBP"; // default
    });

    // Remaining rows: role name + rates
    const results: { name: string; role_id: string; hourly_rate: number; currency: string }[] = [];
    const errors: string[] = [];
    let autoCreatedRoles = 0;

    // Collect missing roles first
    const missingRoles = new Set<string>();
    for (let i = 2; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      const roleName = cols[0]?.trim();
      if (!roleName) continue;
      if (!roleMap.has(roleName.toLowerCase().trim())) {
        missingRoles.add(roleName.trim());
      }
    }

    const processRows = async () => {
      // Auto-create missing roles
      if (missingRoles.size > 0) {
        const newRoles = buildUniqueRoleUpserts(missingRoles);
        const { error } = await supabase.from("roles").upsert(newRoles, { onConflict: "name" });
        if (error) { toast.error(`Failed to create roles: ${error.message}`); return; }
        const { data: allRoles } = await supabase.from("roles").select("id, name").order("name");
        for (const r of allRoles || []) roleMap.set(normalizeRoleName(r.name), r.id);
        autoCreatedRoles = newRoles.length;
        queryClient.invalidateQueries({ queryKey: ["roles"] });
      }

      for (let i = 2; i < lines.length; i++) {
        const cols = lines[i].split("\t");
        const roleName = cols[0]?.trim();
        if (!roleName) continue;

        const roleId = roleMap.get(roleName.toLowerCase().trim());
        if (!roleId) {
          errors.push(`Row ${i + 1}: role "${roleName}" not found`);
          continue;
        }

        for (let j = 0; j < clientNames.length; j++) {
          const clientName = clientNames[j];
          if (!clientName) continue;
          const rawVal = (cols[j + 1] || "").trim().replace(/[£$€,]/g, "").toLowerCase();
          if (!rawVal || rawVal === "blank" || rawVal === "n/a" || rawVal === "") continue;
          const rate = parseFloat(rawVal);
          if (isNaN(rate) || rate <= 0) continue;

          results.push({
            name: clientName,
            role_id: roleId,
            hourly_rate: rate,
            currency: currencies[j] || "GBP",
          });
        }
      }

      if (errors.length > 0) {
        console.warn("Rate card import errors:", errors);
        toast.warning(`${errors.length} row(s) had issues`, { duration: 8000 });
      }

      if (autoCreatedRoles > 0) {
        toast.info(`Auto-created ${autoCreatedRoles} new role(s)`);
      }

      if (!results.length) { toast.error("No valid rate card entries"); return; }
      importRateCards.mutate(results);
    };

    processRows();
  };

  return (
    <ImportPanel
      title="Import UK Rate Cards"
      description="Import client rate cards from your rate card matrix. Row 1 = client names, Row 2 = currency per client, subsequent rows = role + rates."
      columns="Role, Client 1 rate, Client 2 rate, ..."
      placeholder={"Role\tNike\tAdidas\tPuma\nFX Rate\tGBP\tEUR\tGBP\nDesigner\t119.00\t125.00\t95.00\nDeveloper\t161.00\t169.00\t129.00"}
      pasteData={pasteData}
      setPasteData={setPasteData}
      onImport={handleImport}
      isPending={importRateCards.isPending}
      buttonLabel="Import Rate Cards"
      warning="This will replace all existing rate card data."
      lastImported={lastImported}
    />
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────

const DataPage = () => {
  const { data: imports = [] } = useQuery({
    queryKey: ["data_imports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("data_imports" as any).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const getImport = (dataset: string) => imports.find((i: any) => i.dataset === dataset) || null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import and manage all your data from Google Sheets. Paste tab-separated data from each source below.
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="roles">Roles & Capacities</TabsTrigger>
          <TabsTrigger value="people">People Counter Global</TabsTrigger>
          <TabsTrigger value="projects">Data Summary</TabsTrigger>
          <TabsTrigger value="lost">Briefs per Month</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="scopes">Scopes</TabsTrigger>
          <TabsTrigger value="ratecards">UK Rate Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="roles"><RolesImportTab lastImported={getImport("roles")} /></TabsContent>
        <TabsContent value="people"><PeopleImportTab lastImported={getImport("people")} /></TabsContent>
        <TabsContent value="projects"><ProjectsImportTab lastImported={getImport("projects")} /></TabsContent>
        <TabsContent value="lost"><LostProjectsImportTab lastImported={getImport("lost_projects")} /></TabsContent>
        <TabsContent value="timesheets"><TimesheetsImportTab lastImported={getImport("timesheets")} /></TabsContent>
        <TabsContent value="scopes"><ScopesImportTab lastImported={getImport("scopes")} /></TabsContent>
        <TabsContent value="ratecards"><RateCardsImportTab lastImported={getImport("rate_cards")} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default DataPage;
