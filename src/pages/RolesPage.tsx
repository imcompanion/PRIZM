import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const HOURS_PER_DAY = 7.5;

const RolesPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [pasteData, setPasteData] = useState("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("roles").insert({ name, billable_capacity_hours: (parseFloat(capacity) / 100) * HOURS_PER_DAY });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setOpen(false);
      setName("");
      setCapacity("100");
      toast.success("Role created");
    },
    onError: (e) => toast.error(e.message),
  });

  const importRoles = useMutation({
    mutationFn: async (rows: { name: string; billable_capacity_hours: number }[]) => {
      // Clear dependent tables first, then roles
      await supabase.from("phase_allocations").delete().not("id", "is", null);
      await supabase.from("daily_allocations").delete().not("id", "is", null);
      await supabase.from("allocations").delete().not("id", "is", null);
      await supabase.from("project_scopes").delete().not("id", "is", null);
      await supabase.from("people").delete().not("id", "is", null);
      await supabase.from("rate_cards").delete().not("id", "is", null);
      const { error: delErr } = await supabase.from("roles").delete().not("id", "is", null);
      if (delErr) throw delErr;

      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("roles").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
    },
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["people"] });
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      setImportOpen(false);
      setPasteData("");
      toast.success(`${rows.length} roles imported (previous data cleared)`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImport = () => {
    const lines = pasteData.trim().split("\n").filter(Boolean);
    if (lines.length === 0) {
      toast.error("No data to import");
      return;
    }

    const rows = lines.map((line) => {
      const parts = line.split("\t");
      if (parts.length < 2) return null;
      const roleName = parts[0].trim();
      const capStr = parts[1].trim().replace("%", "");
      const capNum = parseFloat(capStr);
      if (!roleName || isNaN(capNum)) return null;
      return { name: roleName, billable_capacity_hours: (capNum / 100) * HOURS_PER_DAY };
    });

    const valid = rows.filter(Boolean) as { name: string; billable_capacity_hours: number }[];
    if (valid.length === 0) {
      toast.error("No valid rows found. Expected two tab-separated columns: Role and Billable Capacity %");
      return;
    }

    importRoles.mutate(valid);
  };

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">Define team roles and their billable capacity</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import from Sheet</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Import Roles</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copy two columns from Google Sheets — <strong>Role</strong> and <strong>Billable Capacity %</strong> — and paste below.
                </p>
                <Textarea
                  rows={8}
                  placeholder={"Designer\t80\nDeveloper\t100\nPM\t50"}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                />
                <Button onClick={handleImport} disabled={!pasteData.trim()} className="w-full">
                  Import Roles
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Role</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Role</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Role Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Designer" />
                </div>
                <div>
                  <Label>Billable Capacity (%)</Label>
                  <Input type="number" min="0" max="100" step="5" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
                <Button onClick={() => createRole.mutate()} disabled={!name} className="w-full">Create Role</Button>
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
                <TableHead>Role</TableHead>
                <TableHead>Billable Capacity</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : roles.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No roles yet. Add your first role above.</TableCell></TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{Math.round((role.billable_capacity_hours / HOURS_PER_DAY) * 100)}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteRole.mutate(role.id)}>
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

export default RolesPage;
