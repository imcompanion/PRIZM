import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertTriangle, Clock, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parse, formatDistanceToNow, isValid } from "date-fns";
import Papa from "papaparse";

interface ImportProgress {
  current: number;
  total: number;
}

const DB_NAME = "timesheets_import_db";
const DB_VERSION = 1;
const STORE_NAME = "import_queue";

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImportQueue = async (entries: any[], fromDate: string | null, toDate: string | null, currentIndex: number) => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ entries, fromDate, toDate, currentIndex }, "active_queue");
  } catch (e) {
    console.error("Failed to save import queue to IndexedDB:", e);
  }
};

export const getImportQueue = async (): Promise<{ entries: any[]; fromDate: string | null; toDate: string | null; currentIndex: number } | null> => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const request = store.get("active_queue");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const clearImportQueue = async () => {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete("active_queue");
  } catch (e) {
    console.error("Failed to clear import queue:", e);
  }
};

let globalProgress: ImportProgress | null = null;
let globalIsImporting = false;
let globalError: string | null = null;
const progressListeners = new Set<(state: { progress: ImportProgress | null; isImporting: boolean; error: string | null }) => void>();

const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = "An import is currently running. Refreshing or closing the tab will abort the current process (it will attempt to resume on reload).";
  return e.returnValue;
};

const updateGlobalImportState = (isImporting: boolean, progress: ImportProgress | null, error: string | null = null) => {
  globalIsImporting = isImporting;
  globalProgress = progress;
  globalError = error;
  
  if (isImporting && progress) {
    const percent = Math.round((progress.current / progress.total) * 100);
    toast.loading(`Importing timesheets: ${progress.current.toLocaleString()} / ${progress.total.toLocaleString()} (${percent}%)`, { id: 'import-toast' });
    window.addEventListener("beforeunload", beforeUnloadHandler);
  } else if (!isImporting) {
    toast.dismiss('import-toast');
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  }

  progressListeners.forEach(listener => listener({ progress: globalProgress, isImporting: globalIsImporting, error: globalError }));
};

export const resumeGlobalImportIfNeeded = async (queryClient: any) => {
  const savedQueue = await getImportQueue();
  if (!savedQueue) return;

  const { entries, fromDate, toDate, currentIndex } = savedQueue;
  if (currentIndex >= entries.length) {
    await clearImportQueue();
    return;
  }

  console.log(`Resuming timesheets import from index ${currentIndex} of ${entries.length}...`);

  updateGlobalImportState(true, { current: currentIndex, total: entries.length });

  // Run in background
  (async () => {
    try {
      // Supabase (PostgreSQL) handles bulk inserts well, but we need to stay under the statement timeout
      const CONCURRENCY_LIMIT = 1000;
      for (let i = currentIndex; i < entries.length; i += CONCURRENCY_LIMIT) {
        const batch = entries.slice(i, i + CONCURRENCY_LIMIT);
        
        const { error } = await supabase.from('time_entries').insert(
          batch.map(entry => ({
            id: crypto.randomUUID(),
            date: entry.date,
            hours: entry.hours,
            notes: entry.notes,
            person_id: entry.person_id,
            person_name: entry.fallback_person_name,
            project_id: entry.project_id,
            project_code: entry.fallback_opportunity_number,
            project_name: entry.fallback_project_name
          }))
        );
        if (error) throw error;
        
        const nextIndex = Math.min(i + CONCURRENCY_LIMIT, entries.length);
        updateGlobalImportState(true, { current: nextIndex, total: entries.length });
        await saveImportQueue(entries, fromDate, toDate, nextIndex);
      }

      await recordImport("timesheets", entries.length, queryClient);

      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
      queryClient.invalidateQueries({ queryKey: ["project_hours"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets_timeframe"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_project_costs"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_monthly_costs"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_hours_by_role"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_costs_by_role"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_project_person_hours"] });
      queryClient.invalidateQueries({ queryKey: ["profitability_project_person_project_hours"] });
      queryClient.invalidateQueries({ queryKey: ["utilisation_summary"] });
      queryClient.invalidateQueries({ queryKey: ["utilisation_summary_monthly"] });

      await clearImportQueue();
      updateGlobalImportState(false, null);
      toast.success(`Successfully completed resumed import of ${entries.length} timesheets`);
    } catch (err: any) {
      console.error("Resumed import failed:", err);
      updateGlobalImportState(false, null, err.message || "Import failed");
    }
  })();
};

const tryParseDate = (val: string): string | null => {
  if (!val?.trim()) return null;
  const formats = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd MMM yyyy", "MMM dd, yyyy"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.trim(), fmt, new Date());
      if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
    } catch {}
  }
  const native = new Date(val.trim());
  if (isValid(native)) return format(native, "yyyy-MM-dd");
  return null;
};

const recordImport = async (dataset: string, rowCount: number, queryClient: any) => {
  await supabase.from("data_imports" as any).upsert(
    { dataset, last_imported_at: new Date().toISOString(), row_count: rowCount } as any,
    { onConflict: "dataset" } as any
  );
  queryClient.invalidateQueries({ queryKey: ["data_imports"] });
};

const cleanStr = (value: string) => (value || "").replace(/^["']+|["']+$/g, "").trim();

export const TimesheetsImport = ({ lastImported }: { lastImported?: any }) => {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Fetch current database timeframe
  const { data: timeframe, isLoading: isLoadingTimeframe } = useQuery({
    queryKey: ["timesheets_timeframe"],
    queryFn: async () => {
      const { data: minRes } = await supabase.from('time_entries').select('date').order('date', { ascending: true }).limit(1);
      const { data: maxRes } = await supabase.from('time_entries').select('date').order('date', { ascending: false }).limit(1);
      
      const minDate = minRes?.[0]?.date;
      const maxDate = maxRes?.[0]?.date;
      
      return { minDate, maxDate };
    }
  });

  const [importProgress, setImportProgress] = useState<ImportProgress | null>(globalProgress);
  const [isPending, setIsPending] = useState(globalIsImporting);

  useEffect(() => {
    const listener = (state: { progress: ImportProgress | null; isImporting: boolean; error: string | null }) => {
      setImportProgress(state.progress);
      setIsPending(state.isImporting);
      if (state.error) {
        toast.error(state.error);
      }
    };
    progressListeners.add(listener);
    setImportProgress(globalProgress);
    setIsPending(globalIsImporting);
    return () => {
      progressListeners.delete(listener);
    };
  }, []);

  const importEntries = useMutation({
    mutationFn: async ({ entries, fromDate, toDate }: { entries: any[]; fromDate: string | null; toDate: string | null }) => {
      updateGlobalImportState(true, { current: 0, total: entries.length });
      await saveImportQueue(entries, fromDate, toDate, 0);

      try {
        if (fromDate && toDate) {
          const { error } = await supabase.from('time_entries').delete().gte('date', fromDate).lte('date', toDate);
          if (error) throw error;
        } else if (fromDate) {
          const { error } = await supabase.from('time_entries').delete().gte('date', fromDate);
          if (error) throw error;
        } else {
          // Instead of deleting all one by one, use a raw SQL RPC or a not.is.null filter to delete all
          const { error } = await supabase.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) throw error;
        }

        // Supabase (PostgreSQL) handles bulk inserts well, but we need to stay under the statement timeout
        const CONCURRENCY_LIMIT = 1000;
        
        for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
          const batch = entries.slice(i, i + CONCURRENCY_LIMIT);
          
          const { error } = await supabase.from('time_entries').insert(
            batch.map(entry => ({
              id: crypto.randomUUID(),
              date: entry.date,
              hours: entry.hours,
              notes: entry.notes,
              person_id: entry.person_id,
              person_name: entry.fallback_person_name,
              project_id: entry.project_id,
              project_code: entry.fallback_opportunity_number,
              project_name: entry.fallback_project_name
            }))
          );
          if (error) throw error;
          
          const nextIndex = Math.min(i + CONCURRENCY_LIMIT, entries.length);
          updateGlobalImportState(true, { current: nextIndex, total: entries.length });
          await saveImportQueue(entries, fromDate, toDate, nextIndex);
        }

        await recordImport("timesheets", entries.length, queryClient);

        // Invalidate profitability and utilisation aggregations
        queryClient.invalidateQueries({ queryKey: ["time_entries"] });
        queryClient.invalidateQueries({ queryKey: ["time_entries_all"] });
        queryClient.invalidateQueries({ queryKey: ["project_hours"] });
        queryClient.invalidateQueries({ queryKey: ["timesheets_timeframe"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_project_costs"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_monthly_costs"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_hours_by_role"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_costs_by_role"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_project_person_hours"] });
        queryClient.invalidateQueries({ queryKey: ["profitability_project_person_project_hours"] });
        queryClient.invalidateQueries({ queryKey: ["utilisation_summary"] });
        queryClient.invalidateQueries({ queryKey: ["utilisation_summary_monthly"] });

        await clearImportQueue();
        updateGlobalImportState(false, null);
        toast.success(`Successfully imported ${entries.length} timesheets`);
      } catch (err: any) {
        console.error("Import error:", err);
        updateGlobalImportState(false, null, err.message || "Import failed");
        throw err;
      }
    }
  });

  const processCsvData = async (lines: string[][]) => {
    if (lines.length < 2) { toast.error("No valid data found in CSV"); return; }
    
    const headers = lines[0].map((h) => (h || "").trim().toLowerCase());
    const findCol = (...keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex((h) => h.includes(k));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const col = {
      date: findCol("date"),
      hours: findCol("hours"),
      notes: findCol("notes", "task"),
      project_name: findCol("project_name", "project name", "project"),
      project_code: findCol("project_code", "project code", "code"),
      person_name: findCol("person_name", "person name", "name"),
      first_name: findCol("first_name", "first name"),
      last_name: findCol("last_name", "last name"),
      office: findCol("office"),
      role: findCol("role"),
      project_title: findCol("project_title", "project title"),
      opportunity_number: findCol("opportunity_number", "opportunity number", "opp")
    };

    const hasPersonName = col.person_name !== -1 || (col.first_name !== -1 && col.last_name !== -1);
    if (col.date === -1 || col.hours === -1 || !hasPersonName) {
      toast.error("Missing required columns: date, hours, person_name (or first_name & last_name)");
      return;
    }

    const fetchAllData = async (table: string, columns: string) => {
      let all = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase.from(table).select(columns).range(from, from + step - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < step) break;
        from += step;
      }
      return all;
    };

    const allProjects = await fetchAllData("projects", "id, opportunity_number, title");
    const allPeople = await fetchAllData("people", "id, name, code, role_id, employment_start_date");

    const projectMapByCode = new Map((allProjects || []).filter(p => p.opportunity_number).map(p => [p.opportunity_number!.toLowerCase().trim().replace(/^0+/, ""), p.id]));
    const projectMapByName = new Map((allProjects || []).filter(p => p.title).map(p => [p.title.toLowerCase().trim(), p.id]));

    const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const peopleByName = new Map<string, any[]>();
    for (const p of allPeople || []) {
      const name = stripDiacritics(p.name.toLowerCase().trim());
      if (!peopleByName.has(name)) peopleByName.set(name, []);
      peopleByName.get(name)?.push(p);
    }

    const getPersonIds = (first: string, last: string, entryDate: string): string[] => {
      const targetName = stripDiacritics(`${first} ${last}`.toLowerCase().trim());
      const targetDate = entryDate ? new Date(entryDate).getTime() : 0;

      const matches = peopleByName.get(targetName) || [];
      if (matches.length === 0) return [];
      if (matches.length === 1) return [matches[0].id];

      const validMatches = matches.filter(p => {
        if (!p.employment_start_date) return true;
        return new Date(p.employment_start_date).getTime() <= targetDate;
      });

      if (validMatches.length === 0) return [matches[0].id];
      validMatches.sort((a, b) => {
        const da = a.employment_start_date ? new Date(a.employment_start_date).getTime() : 0;
        const db = b.employment_start_date ? new Date(b.employment_start_date).getTime() : 0;
        return db - da; 
      });

      return [validMatches[0].id];
    };

    const entries = [];
    const errors = [];
    let earliestDate: string | null = null;
    let latestDate: string | null = null;

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i];
      if (!cells || cells.length < 2) continue;

      const dVal = cells[col.date];
      if (!dVal) continue;
      
      const parsedDate = tryParseDate(dVal);
      if (!parsedDate) { errors.push(`Row ${i+1}: invalid date "${dVal}"`); continue; }
      
      if (!earliestDate || parsedDate < earliestDate) {
        earliestDate = parsedDate;
      }
      if (!latestDate || parsedDate > latestDate) {
        latestDate = parsedDate;
      }

      const hVal = parseFloat(cells[col.hours]?.replace(/[^\d.-]/g, ''));
      if (isNaN(hVal) || hVal <= 0) continue;

      let fullName = "";
      let fName = "";
      let lName = "";
      
      if (col.first_name !== -1 && col.last_name !== -1) {
        fName = cleanStr(cells[col.first_name] || "");
        lName = cleanStr(cells[col.last_name] || "");
        fullName = `${fName} ${lName}`.trim();
      } else if (col.person_name !== -1) {
        fullName = cleanStr(cells[col.person_name] || "");
        fName = fullName.split(" ")[0] || "";
        lName = fullName.split(" ").slice(1).join(" ") || "";
      }

      if (!fullName) { errors.push(`Row ${i+1}: missing name`); continue; }

      const pIds = getPersonIds(fName, lName, parsedDate);
      const personId = pIds.length > 0 ? pIds[0] : null;

      let projectId = null;
      if (col.project_code !== -1) {
        const code = cleanStr(cells[col.project_code] || "");
        if (code) projectId = projectMapByCode.get(code.toLowerCase().replace(/^0+/, ""));
      }
      if (!projectId && col.opportunity_number !== -1) {
        const opp = cleanStr(cells[col.opportunity_number] || "");
        if (opp) projectId = projectMapByCode.get(opp.toLowerCase().replace(/^0+/, ""));
      }
      if (!projectId && col.project_title !== -1) {
        const pname = cleanStr(cells[col.project_title] || "");
        if (pname) projectId = projectMapByName.get(pname.toLowerCase());
      }
      if (!projectId && col.project_name !== -1) {
        const pname = cleanStr(cells[col.project_name] || "");
        if (pname) projectId = projectMapByName.get(pname.toLowerCase());
      }

      let isBillable = true;
      const notes = col.notes !== -1 ? cleanStr(cells[col.notes] || "") : null;
      if (notes && (notes.toLowerCase().includes("leave") || notes.toLowerCase().includes("holiday") || notes.toLowerCase().includes("closed"))) {
        isBillable = false;
      }

      entries.push({
        date: parsedDate,
        person_id: personId,
        project_id: projectId,
        hours: hVal,
        task: null,
        notes: notes,
        is_billable: isBillable,
        fallback_person_name: !personId ? fullName : null,
        fallback_project_name: !projectId
          ? (col.project_name !== -1 ? cleanStr(cells[col.project_name] || "")
             : col.project_title !== -1 ? cleanStr(cells[col.project_title] || "") : null)
          : null,
        fallback_opportunity_number: !projectId
          ? (col.project_code !== -1 ? cleanStr(cells[col.project_code] || "")
             : col.opportunity_number !== -1 ? cleanStr(cells[col.opportunity_number] || "") : null)
          : null,
      });
    }

    if (errors.length > 0) {
      toast.warning(`${errors.length} issues skipped (e.g. ${errors[0]})`);
    }

    if (!entries.length) { toast.error("No valid entries found in file"); return; }
    
    // Use the exact date range found in the file as the overwrite window
    updateGlobalImportState(true, { current: 0, total: entries.length });
    importEntries.mutate({ entries, fromDate: earliestDate, toDate: latestDate });
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    setParsing(true);
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        processCsvData(results.data).finally(() => setParsing(false));
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        toast.error(`Error reading CSV: ${error.message}`);
        setParsing(false);
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-display">Harvest Timesheet Import</CardTitle>
            <CardDescription>Drag and drop a Harvest CSV export to synchronize timesheets.</CardDescription>
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
      <CardContent className="space-y-6">
        
        {/* Timeframe Info */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-blue-900">Current Database Coverage</h3>
          {isLoadingTimeframe ? (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching timeframe...
            </div>
          ) : timeframe?.minDate && timeframe?.maxDate ? (
            <p className="text-sm text-blue-800">
              The database currently holds timesheets from <strong>{format(new Date(timeframe.minDate), "dd MMM yyyy")}</strong> to <strong>{format(new Date(timeframe.maxDate), "dd MMM yyyy")}</strong>.
              <br/><br/>
              You only need to upload Harvest data from <strong>{format(new Date(timeframe.maxDate), "dd MMM yyyy")}</strong> onwards.
            </p>
          ) : (
            <p className="text-sm text-blue-800">No timesheets currently exist in the database.</p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>When you upload a file, the system will automatically find the earliest and latest date in your CSV and <strong>safely replace existing timesheets within that exact date range</strong> to prevent duplicates.</span>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-10 transition-colors flex flex-col items-center justify-center gap-4 text-center cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}
            ${(parsing || isPending) ? 'opacity-50 pointer-events-none' : ''}
          `}
          onClick={() => {
            const el = document.getElementById("csv-upload-input");
            if (el) el.click();
          }}
        >
          <input 
            type="file" 
            id="csv-upload-input" 
            accept=".csv" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              e.target.value = ''; // Reset input
            }}
          />
          
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {parsing || isPending ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {parsing ? "Parsing CSV..." : 
               importProgress ? `Importing Timesheets (${importProgress.current.toLocaleString()} / ${importProgress.total.toLocaleString()})...` : 
               isPending ? "Importing Timesheets..." : "Click or drag Harvest CSV here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports standard Harvest detailed time reports
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
