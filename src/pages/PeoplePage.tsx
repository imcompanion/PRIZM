import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, CalendarIcon, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateInternalCostPerHour, formatCurrency, formatCurrencyFixed } from "@/lib/calculations";

const PeoplePage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pasteData, setPasteData] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [team, setTeam] = useState("");
  const [salary, setSalary] = useState("");
  const [office, setOffice] = useState("UK");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("people").select("*, roles(name, billable_capacity_hours)").order("name").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const createPerson = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("people").insert({
        name,
        role_id: roleId,
        team: team || null,
        annual_salary: salary ? parseFloat(salary) : null,
        office,
        employment_start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        employment_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      setOpen(false);
      setName("");
      setRoleId("");
      setTeam("");
      setSalary("");
      setOffice("UK");
      setStartDate(undefined);
      setEndDate(undefined);
      toast.success("Person added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePerson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      toast.success("Person deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const importPeople = useMutation({
    mutationFn: async (rows: { name: string; role_id: string; office: string; annual_salary: number | null; employment_start_date: string | null; employment_end_date: string | null }[]) => {
      const { error } = await supabase.from("people").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people"] });
      setImportOpen(false);
      setPasteData("");
      toast.success("People imported");
    },
    onError: (e) => toast.error(e.message),
  });

  const parseDate = (val: string): string | null => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM-dd");
  };

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (lines.length === 0) { toast.error("No data to import"); return; }

    const roleMap = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));

    const unmatchedRoles: string[] = [];
    const rows = lines.map((line) => {
      const parts = line.split("\t");
      // Expected columns: Name, Role, Team, Start Date, End Date, Office, Salary
      if (parts.length < 2) return null;
      const personName = parts[0]?.trim();
      const roleName = parts[1]?.trim();
      const teamVal = parts[2]?.trim() || "";
      const start = parts[3]?.trim() || "";
      const end = parts[4]?.trim() || "";
      const offRaw = (parts[5]?.trim() || "UK").toLowerCase();
      const off = (offRaw === "us" || offRaw === "united states" || offRaw === "usa") ? "US" : "UK";
      const sal = parts[6]?.trim().replace(/[£$,]/g, "");

      if (!personName || !roleName) return null;
      const matchedRoleId = roleMap.get(roleName.toLowerCase());
      if (!matchedRoleId) {
        if (!unmatchedRoles.includes(roleName)) unmatchedRoles.push(roleName);
        return null;
      }

      return {
        name: personName,
        role_id: matchedRoleId,
        team: teamVal || null,
        office: off,
        annual_salary: sal ? parseFloat(sal) || null : null,
        employment_start_date: parseDate(start),
        employment_end_date: parseDate(end),
      };
    });

    const valid = rows.filter(Boolean) as any[];
    if (unmatchedRoles.length > 0) {
      toast.error(`Unmatched roles: ${unmatchedRoles.join(", ")}`, { duration: 10000 });
    }
    if (valid.length === 0) {
      toast.error("No valid rows found. Ensure Role names match existing roles.");
      return;
    }
    const skipped = rows.length - valid.length;
    if (skipped > 0) toast.warning(`${skipped} row(s) skipped`);
    importPeople.mutate(valid);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">People</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage team members and their salary costs</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import from Sheet</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Import People</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copy rows from Google Sheets with columns: <strong>Name, Role, Team, Start Date, End Date, Office (UK/US), Salary</strong> — and paste below. Role names must match existing roles.
                </p>
                <Textarea
                  rows={8}
                  placeholder={"Jane Smith\tDesigner\tCreative\t01/03/2024\t\tUK\t45000\nJohn Doe\tDeveloper\tEngineering\t15/06/2023\t\tUS\t95000"}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
                <Button onClick={handleImport} disabled={!pasteData.trim()} className="w-full">
                  Import People
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Person</Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Person</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Team</Label>
                <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Creative, Engineering" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label>Office</Label>
                <Select value={office} onValueChange={setOffice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Annual Salary ({office === "US" ? "$" : "£"})</Label>
                <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 45000" />
              </div>
              <Button onClick={() => createPerson.mutate()} disabled={!name || !roleId} className="w-full">Add Person</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Annual Salary</TableHead>
                <TableHead>Internal Cost/hr</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : people.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No people yet. Add roles first, then add team members.</TableCell></TableRow>
              ) : (
                people.map((person: any) => {
                  const off = person.office || "UK";
                  return (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell>{person.roles?.name}</TableCell>
                      <TableCell>{person.team || "—"}</TableCell>
                      <TableCell className="text-sm">{person.employment_start_date ? format(new Date(person.employment_start_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">{person.employment_end_date ? format(new Date(person.employment_end_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{off}</TableCell>
                      <TableCell>{person.annual_salary ? formatCurrency(person.annual_salary, off) : "—"}</TableCell>
                      <TableCell>{person.annual_salary ? `${formatCurrencyFixed(calculateInternalCostPerHour(person.annual_salary, person.roles?.billable_capacity_hours), off)}/hr` : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deletePerson.mutate(person.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PeoplePage;