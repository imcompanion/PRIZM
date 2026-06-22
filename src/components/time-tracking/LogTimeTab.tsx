import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";


const LogTimeTab = () => {
  const queryClient = useQueryClient();
  const [personId, setPersonId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("people").select("*, roles(name)").order("name").range(from, from + 999);
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
        const { data, error } = await supabase.from("projects").select("*").order("title").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["time_entries_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, people(name, roles(name)), projects(title)")
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("time_entries").insert({
        person_id: personId,
        project_id: projectId,
        date: format(date, "yyyy-MM-dd"),
        hours: parseFloat(hours),
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_recent"] });
      setHours("");
      setNotes("");
      toast.success("Time logged");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries_recent"] });
      toast.success("Entry deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Log Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Person</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger><SelectValue placeholder="Who?" /></SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Which project?" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd MMM")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Hours</Label>
              <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 2.5" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => createEntry.mutate()} disabled={!personId || !projectId || !hours} className="w-full">
                Log Time
              </Button>
            </div>
          </div>
          <div className="mt-3">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you work on?" className="h-16" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No time entries yet.</TableCell></TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{(e as any).people?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{(e as any).people?.roles?.name || "—"}</TableCell>
                    <TableCell>{(e as any).projects?.title}</TableCell>
                    <TableCell>{e.hours}h</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.notes || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogTimeTab;
