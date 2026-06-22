import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const ImportScopesDialog = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_scope_import"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, opportunity_number")
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

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const importScopes = useMutation({
    mutationFn: async (rows: { project_id: string; role_id: string; scoped_hours: number }[]) => {
      // Get unique project IDs being imported
      const projectIds = [...new Set(rows.map((r) => r.project_id))];

      // Delete existing scopes (and related phase_allocations/allocations) for those projects
      for (const pid of projectIds) {
        const { data: existingScopes } = await supabase
          .from("project_scopes")
          .select("id")
          .eq("project_id", pid);
        if (existingScopes && existingScopes.length > 0) {
          const scopeIds = existingScopes.map((s) => s.id);
          await supabase.from("phase_allocations").delete().in("project_scope_id", scopeIds);
          await supabase.from("allocations").delete().in("project_scope_id", scopeIds);
          await supabase.from("project_scopes").delete().eq("project_id", pid);
        }
      }

      const { error } = await supabase.from("project_scopes").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project_scopes"] });
      setOpen(false);
      setPasteData("");
      toast.success(`${rows.length} scoped hours imported (previous scopes replaced)`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (lines.length === 0) {
      toast.error("No data to import");
      return;
    }

    // Build lookup maps
    const projectCodeMap = new Map(
      projects
        .filter((p) => p.opportunity_number)
        .map((p) => [p.opportunity_number!.toLowerCase().trim(), p.id])
    );
    const roleMap = new Map(roles.map((r) => [r.name.toLowerCase().trim(), r.id]));

    const valid: { project_id: string; role_id: string; scoped_hours: number }[] = [];
    const errors: string[] = [];

    // Check if first row is a header
    const firstCols = lines[0].split("\t");
    const firstColLower = firstCols[0]?.trim().toLowerCase() || "";
    const isHeader = ["opp", "opportunity", "number", "project"].some(k => firstColLower.includes(k));
    const startIdx = isHeader ? 1 : 0;

    // Detect column layout: find which columns contain opp number, role, and hours
    // Default: Opp Number (0), Office (1), Opportunity (2), Role (3), Hours (4)
    let oppCol = 0, roleCol = 3, hoursCol = 4;

    if (isHeader) {
      const headers = firstCols.map(h => h.trim().toLowerCase());
      console.log("Detected headers:", headers);
      
      const oppIdx = headers.findIndex(h => h.includes("opp") && h.includes("number") || h === "opp number");
      const roleIdx = headers.findIndex(h => h === "role" || h === "roles");
      const hoursIdx = headers.findIndex(h => h === "hours" || h.includes("scoped"));
      
      if (oppIdx !== -1) oppCol = oppIdx;
      if (roleIdx !== -1) roleCol = roleIdx;
      if (hoursIdx !== -1) hoursCol = hoursIdx;
      console.log(`Column mapping: opp=${oppCol}, role=${roleCol}, hours=${hoursCol}`);
    }

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      console.log(`Row ${i + 1}: ${cols.length} cols:`, cols);

      const oppNumber = cols[oppCol]?.trim() || "";
      const roleName = cols[roleCol]?.trim() || "";
      const hoursRaw = cols[hoursCol]?.trim() || "";

      const hours = parseFloat(hoursRaw);
      if (isNaN(hours) || hours <= 0) {
        // Skip rows with 0 or invalid hours silently
        continue;
      }

      if (!oppNumber) {
        errors.push(`Row ${i + 1}: missing opp number`);
        continue;
      }

      const projectId = projectCodeMap.get(oppNumber.toLowerCase());
      if (!projectId) {
        errors.push(`Row ${i + 1}: project code not found "${oppNumber}"`);
        continue;
      }

      if (!roleName) {
        errors.push(`Row ${i + 1}: missing role`);
        continue;
      }

      const roleId = roleMap.get(roleName.toLowerCase());
      if (!roleId) {
        errors.push(`Row ${i + 1}: role not found "${roleName}"`);
        continue;
      }

      valid.push({
        project_id: projectId,
        role_id: roleId,
        scoped_hours: hours,
      });
    }

    if (errors.length > 0) {
      const preview = errors.slice(0, 5).join("\n");
      const more = errors.length > 5 ? `\n...and ${errors.length - 5} more` : "";
      toast.error(`${errors.length} row(s) skipped:\n${preview}${more}`, { duration: 8000 });
    }

    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    importScopes.mutate(valid);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />Import Scopes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Import Scoped Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy rows from your spreadsheet with columns:{" "}
            <strong>Opp Number, Office, Opportunity, Role, Hours</strong>
            — and paste below.
          </p>
          <p className="text-xs text-muted-foreground">
            Projects are matched by <strong>Opp Number</strong> (Opportunity Number). Roles must match existing role names exactly. Rows with 0 hours are skipped.
          </p>
          <Textarea
            rows={8}
            placeholder={"12345\tUK\tAcme Rebrand\tDesigner\t120\n12345\tUK\tAcme Rebrand\tAccount Manager\t80"}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          <Button onClick={handleImport} disabled={!pasteData.trim() || importScopes.isPending} className="w-full">
            {importScopes.isPending ? "Importing..." : "Import Scoped Hours"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportScopesDialog;
