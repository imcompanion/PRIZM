import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ImportTimeEntriesDialog = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("people").select("id, name").order("name").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("projects").select("id, title, opportunity_number").order("title").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const importEntries = useMutation({
    mutationFn: async (rows: { person_id: string; project_id: string | null; date: string; hours: number; notes: string | null; project_name: string | null }[]) => {
      if (rows.length === 0) return;
      
      const dates = rows.map(r => r.date).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      // Delete existing time entries within this exact date range
      const { error: deleteError } = await supabase.from("time_entries")
        .delete()
        .gte("date", minDate)
        .lte("date", maxDate);
        
      if (deleteError) throw deleteError;
      
      // Insert in batches of 500 to avoid payload limits
      const BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("time_entries").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      setOpen(false);
      setPasteData("");
      toast.success(`${rows.length} time entries imported`);
    },
    onError: (e) => toast.error(e.message),
  });

  const parseDate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (!isNaN(date.getTime())) return format(date, "yyyy-MM-dd");
    }

    // Try YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return trimmed;
    }

    // Try MM/DD/YYYY
    const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdyMatch) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return format(date, "yyyy-MM-dd");
    }

    return null;
  };

  const handleImport = async () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (lines.length === 0) {
      toast.error("No data to import");
      return;
    }

    // Build lookup maps
    const personMap = new Map(people.map((p) => [p.name.toLowerCase(), p.id]));
    const projectCodeMap = new Map(
      projects
        .filter((p) => p.opportunity_number)
        .map((p) => [p.opportunity_number!.toLowerCase(), p.id])
    );

    const valid: { person_id: string; project_id: string | null; date: string; hours: number; notes: string | null; project_name: string | null }[] = [];
    const errors: string[] = [];
    const unmatchedProjectCodes = new Set<string>();

    const parsed: { personId: string; date: string; hours: number; notes: string | null; projectCode: string; projectId: string | null; projectName: string | null }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      if (cols.length < 8) {
        errors.push(`Row ${i + 1}: expected at least 8 columns, got ${cols.length}`);
        continue;
      }

      const [dateRaw, , projectName, projectCode, task, hoursRaw, firstName, lastName] = cols;

      const parsedDate = parseDate(dateRaw);
      if (!parsedDate) {
        errors.push(`Row ${i + 1}: invalid date "${dateRaw}"`);
        continue;
      }

      const hours = parseFloat(hoursRaw);
      if (isNaN(hours) || hours <= 0) {
        errors.push(`Row ${i + 1}: invalid hours "${hoursRaw}"`);
        continue;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.toLowerCase();
      const personId = personMap.get(fullName);
      if (!personId) {
        errors.push(`Row ${i + 1}: person not found "${firstName.trim()} ${lastName.trim()}"`);
        continue;
      }

      const code = projectCode.trim();
      const codeLower = code.toLowerCase();
      const projectId = codeLower ? (projectCodeMap.get(codeLower) || null) : null;

      if (code && !projectId) unmatchedProjectCodes.add(code);

      parsed.push({
        personId,
        date: parsedDate,
        hours,
        notes: task.trim() || null,
        projectCode: code,
        projectId,
        projectName: projectName.trim() || null,
      });
    }

    for (const row of parsed) {
      valid.push({
        person_id: row.personId,
        project_id: row.projectId || null,
        date: row.date,
        hours: row.hours,
        notes: row.notes,
        project_name: row.projectName || null,
      });
    }

    if (errors.length > 0) {
      const preview = errors.slice(0, 5).join("\n");
      const more = errors.length > 5 ? `\n...and ${errors.length - 5} more` : "";
      toast.error(`${errors.length} row(s) skipped:\n${preview}${more}`, { duration: 8000 });
    }

    if (unmatchedProjectCodes.size > 0) {
      toast.warning(
        `${unmatchedProjectCodes.size} project code(s) were not found; those rows were imported without a project link.`,
        { duration: 7000 }
      );
    }

    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    importEntries.mutate(valid);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />Import from Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Import Time Entries</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy rows from your timesheet with columns:{" "}
            <strong>Date, Client, Project, Project Code, Task, Hours, First Name, Last Name, Roles</strong>
            — and paste below.
          </p>
          <p className="text-xs text-muted-foreground">
            Projects are matched by <strong>Project Code</strong> (Opportunity Number). This will safely overwrite existing timesheets <strong>only within the exact date range</strong> found in your pasted data.
          </p>
          <Textarea
            rows={8}
            placeholder={"01/03/2025\tAcme Corp\tBrand Campaign\tOP-12345\tDesign work\t3.5\tJane\tSmith\tDesigner"}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          <Button onClick={handleImport} disabled={!pasteData.trim() || importEntries.isPending} className="w-full">
            {importEntries.isPending ? "Importing..." : "Import Time Entries"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTimeEntriesDialog;
