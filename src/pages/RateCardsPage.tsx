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
import { Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/calculations";

const VALID_CURRENCIES = ["GBP", "USD", "EUR"];

const RateCardsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [pasteData, setPasteData] = useState("");

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: rateCards = [], isLoading } = useQuery({
    queryKey: ["rate_cards"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("rate_cards").select("*, roles(name)").order("name").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const createRateCard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rate_cards").insert({
        name,
        role_id: roleId,
        hourly_rate: parseFloat(rate),
        currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      setOpen(false);
      setName("");
      setRoleId("");
      setRate("");
      setCurrency("GBP");
      toast.success("Rate card created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRateCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImport = async () => {
    const lines = pasteData.trim().split("\n").map((l) => l.split("\t"));
    if (lines.length < 3) {
      toast.error("Need at least 3 rows: header (client names), currency row, and at least one role row");
      return;
    }

    // Row 0: header — first cell empty/label, then client names
    const clientNames = lines[0].slice(1).map((c) => c.trim()).filter(Boolean);
    if (clientNames.length === 0) {
      toast.error("No client names found in the first row");
      return;
    }

    // Row 1: currencies — first cell empty/label, then currency per client
    const currencies = lines[1].slice(1).map((c) => c.trim().toUpperCase());
    const invalidCurrencies = currencies.filter((c, i) => i < clientNames.length && !VALID_CURRENCIES.includes(c));
    if (invalidCurrencies.length > 0) {
      toast.error(`Invalid currencies: ${[...new Set(invalidCurrencies)].join(", ")}. Use GBP, USD, or EUR.`);
      return;
    }

    // Rows 2+: role name in first column, then rates
    const rows: { name: string; roleName: string; hourlyRate: number; currency: string }[] = [];
    const unmatchedRoles: string[] = [];

    for (let r = 2; r < lines.length; r++) {
      const roleName = lines[r][0]?.trim();
      if (!roleName) continue;

      const role = roles.find((ro) => ro.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        unmatchedRoles.push(roleName);
        continue;
      }

      for (let c = 0; c < clientNames.length; c++) {
        const val = parseFloat(lines[r][c + 1]?.trim());
        if (!isNaN(val) && val > 0) {
          rows.push({
            name: clientNames[c],
            roleName: roleName,
            hourlyRate: val,
            currency: currencies[c] || "GBP",
          });
        }
      }
    }

    if (unmatchedRoles.length > 0) {
      toast.error(`Roles not found: ${[...new Set(unmatchedRoles)].join(", ")}. Add them in the Roles page first.`, { duration: 10000 });
    }

    if (rows.length === 0) {
      toast.error("No valid rate card entries to import");
      return;
    }

    // Build insert rows
    const inserts = rows.map((r) => {
      const role = roles.find((ro) => ro.name.toLowerCase() === r.roleName.toLowerCase())!;
      return {
        name: r.name,
        role_id: role.id,
        hourly_rate: r.hourlyRate,
        currency: r.currency,
      };
    });

    const { error } = await supabase.from("rate_cards").insert(inserts);
    if (error) {
      toast.error(error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
    setImportOpen(false);
    setPasteData("");
    toast.success(`Imported ${inserts.length} rate card entries`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Rate Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">Set client-facing hourly rates per role</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Import from Sheet</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Import Rate Cards from Sheet</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste a table from Google Sheets with this format:
                </p>
                <div className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre overflow-x-auto">
{`\t       Client A\tClient B\tClient C
\t       GBP\t     USD\t     EUR
Designer\t 100\t     120\t     110
Developer\t150\t     180\t     160`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Row 1: Client names. Row 2: Currency (GBP, USD, EUR). Rows 3+: Role name then rates.
                </p>
                <Textarea
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Paste from Google Sheets here..."
                  rows={8}
                />
                <Button onClick={handleImport} disabled={!pasteData.trim()} className="w-full">
                  Import Rate Cards
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Rate Card</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Rate Card</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Client A" />
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
                <div>
                  <Label>Hourly Rate</Label>
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 150" />
                </div>
                <Button onClick={() => createRateCard.mutate()} disabled={!name || !roleId || !rate} className="w-full">Create Rate Card</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <p className="text-center text-muted-foreground p-8">Loading...</p>
          ) : rateCards.length === 0 ? (
            <p className="text-center text-muted-foreground p-8">No rate cards yet.</p>
          ) : (() => {
            // Pivot: group by rate card name, rows = roles
            const cardNames = [...new Set(rateCards.map((rc) => rc.name))];
            const roleNames = [...new Set(rateCards.map((rc) => (rc as any).roles?.name).filter(Boolean))];
            // Sort roles alphabetically
            roleNames.sort((a, b) => a.localeCompare(b));

            // Build lookup: { roleName -> { cardName -> rateCard } }
            const lookup: Record<string, Record<string, typeof rateCards[0]>> = {};
            for (const rc of rateCards) {
              const roleName = (rc as any).roles?.name;
              if (!roleName) continue;
              if (!lookup[roleName]) lookup[roleName] = {};
              lookup[roleName][rc.name] = rc;
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    {cardNames.map((name) => {
                      const sample = rateCards.find((rc) => rc.name === name);
                      return (
                        <TableHead key={name}>
                          <div>{name}</div>
                          <div className="text-xs font-normal text-muted-foreground">{sample?.currency || "GBP"}</div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleNames.map((roleName) => (
                    <TableRow key={roleName}>
                      <TableCell className="font-medium">{roleName}</TableCell>
                      {cardNames.map((cardName) => {
                        const rc = lookup[roleName]?.[cardName];
                        return (
                          <TableCell key={cardName}>
                            {rc ? formatCurrency(rc.hourly_rate, rc.currency) + "/hr" : "—"}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const ids = cardNames.map((cn) => lookup[roleName]?.[cn]?.id).filter(Boolean) as string[];
                            ids.forEach((rcId) => deleteRateCard.mutate(rcId));
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default RateCardsPage;
