import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EMAIL_DOMAIN = "billiondollarboy.com";

// firstinitial + lastname (lowercase, letters only)
function deriveEmail(fullName: string): string {
  const clean = (fullName || "").trim().toLowerCase().replace(/[^a-z\s'-]/g, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0];
  const last = parts[parts.length - 1].replace(/[^a-z]/g, "");
  if (!first || !last) return "";
  return `${first[0]}${last}@${EMAIL_DOMAIN}`;
}

function firstName(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || "there";
}

function buildSubject(completeness: number, periodLabel: string): string {
  return `Timesheet reminder — ${periodLabel} (${Math.round(completeness)}% complete)`;
}

function buildBody(r: { name: string; completeness: number; actualHours: number; expectedHours: number }, periodLabel: string): string {
  const pct = Math.round(r.completeness);
  const actual = Math.round(r.actualHours);
  const expected = Math.round(r.expectedHours);
  return `Hi ${firstName(r.name)},

Just a friendly nudge — your timesheet for ${periodLabel} is currently at ${pct}% complete (${actual}h logged of ${expected}h expected).

When you have a moment, please top it up so we have a clean view of where time is going. It only takes a couple of minutes and makes a big difference to our reporting.

Thanks!

— Sent from the BDB performance tool`;
}

export interface ReminderPerson {
  name: string;
  completeness: number;
  actualHours: number;
  expectedHours: number;
}

interface Props {
  people: ReminderPerson[];
  startDate: Date;
  endDate: Date;
}

export function SendRemindersDialog({ people, startDate, endDate }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"select" | "preview">("select");
  const { toast } = useToast();

  // Filter people <95% with expectedHours > 0
  const candidates = useMemo(
    () => people
      .filter(p => p.expectedHours > 0 && p.completeness < 95)
      .sort((a, b) => a.completeness - b.completeness)
      .map(p => ({ ...p, email: deriveEmail(p.name) })),
    [people],
  );

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates.map(c => c.name)));

  // Re-init selection when candidates change
  const candidateNames = candidates.map(c => c.name).join("|");
  useMemo(() => {
    setSelected(new Set(candidates.map(c => c.name)));
    setStep("select");
  }, [candidateNames]);

  const periodLabel = `${format(startDate, "d MMM")} – ${format(endDate, "d MMM yyyy")}`;

  const selectedRecipients = candidates
    .filter(c => selected.has(c.name))
    .map(c => ({
      name: c.name,
      email: (overrides[c.name] ?? c.email).trim(),
      completeness: c.completeness,
      actualHours: c.actualHours,
      expectedHours: c.expectedHours,
    }));

  const handleSend = async () => {
    if (!selectedRecipients.length) {
      toast({ title: "No one selected", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-completeness-reminders", {
        body: { recipients: selectedRecipients, periodLabel },
      });
      if (error) throw error;
      toast({
        title: "Reminder sent",
        description: `Group email sent to ${data?.sentTo ?? selectedRecipients.length} recipient${(data?.sentTo ?? selectedRecipients.length) === 1 ? "" : "s"} via Gmail`,
      });
      setOpen(false);
      setStep("select");
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => { setStep("select"); setOpen(true); }}
        disabled={candidates.length === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Mail className="h-4 w-4 mr-2" />
        Email reminders ({candidates.length})
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep("select"); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {step === "select" ? "Send timesheet reminders" : "Preview group email"}
            </DialogTitle>
          </DialogHeader>

          {step === "select" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                One group email will be sent to everyone below 95% for <strong>{periodLabel}</strong>, including a table of each person's completeness. Untick anyone you want to leave out.
              </p>

              <div className="rounded-md border divide-y">
                {candidates.map(c => {
                  const isSel = selected.has(c.name);
                  return (
                    <div key={c.name} className="flex items-center gap-3 px-3 py-2">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={(v) => {
                          setSelected(prev => {
                            const next = new Set(prev);
                            if (v) next.add(c.name); else next.delete(c.name);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(c.completeness)}% · {Math.round(c.actualHours)}h / {Math.round(c.expectedHours)}h
                        </p>
                      </div>
                      <Input
                        className="w-64 h-8 text-xs"
                        value={overrides[c.name] ?? c.email}
                        onChange={(e) => setOverrides(p => ({ ...p, [c.name]: e.target.value }))}
                        placeholder="email@domain.com"
                      />
                    </div>
                  );
                })}
                {candidates.length === 0 && (
                  <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                    Everyone is at 95% or above. 🎉
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the group email below. It will be sent to all {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"} in one message.
              </p>
              <div className="rounded-md border bg-card">
                <div className="px-3 py-2 border-b bg-muted/40 text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">To:</span>{" "}
                    <span className="font-medium break-all">
                      {selectedRecipients.map(r => r.email).join(", ") || "(no recipients)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subject:</span>{" "}
                    <span className="font-medium">Timesheet reminder — {periodLabel}</span>
                  </div>
                </div>
                <div className="px-4 py-4 text-sm space-y-3">
                  <p>{selectedRecipients.length === 1 ? `Hi ${firstName(selectedRecipients[0].name)},` : "Hi team,"}</p>
                  <p>
                    Just a friendly nudge — the following timesheets are currently below 95% complete for{" "}
                    <strong>{periodLabel}</strong>. Please top yours up when you have a moment so we have a clean view of where time is going.
                  </p>
                  <table className="w-full max-w-md text-xs border-collapse">
                    <thead>
                      <tr style={{ background: "#ff7daa" }}>
                        <th className="text-left px-3 py-2 border-b font-semibold text-white">Name</th>
                        <th className="text-right px-3 py-2 border-b font-semibold text-white">Completeness</th>
                        <th className="text-right px-3 py-2 border-b font-semibold text-white">Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecipients
                        .slice()
                        .sort((a, b) => a.completeness - b.completeness)
                        .map(r => (
                          <tr key={r.name} className="border-b">
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2 text-right font-semibold">{Math.round(r.completeness)}%</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {Math.round(r.actualHours)}h / {Math.round(r.expectedHours)}h
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p>Thanks!</p>
                  <p>James</p>
                </div>
              </div>
              {selectedRecipients.length === 0 && (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center border rounded-md">
                  No recipients selected. Go back to add some.
                </p>
              )}
            </div>
          )}


          <DialogFooter>
            {step === "select" ? (
              <>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
                <Button onClick={() => setStep("preview")} disabled={selected.size === 0}>
                  Preview group email
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep("select")} disabled={sending}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSend} disabled={sending || selectedRecipients.length === 0}>
                  {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Approve & send {selectedRecipients.length}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
