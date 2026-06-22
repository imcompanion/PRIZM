import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Info, X, ChevronUp, ChevronDown, Pencil, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UnmatchedEntriesReport } from "@/components/billable-work/UnmatchedEntriesReport";

// ── Condition definitions ──────────────────────────
const FIELD_OPTIONS = [
  { value: "has_project_code", label: "Has Project Code", group: "Time Entry" },
  { value: "project_in_projects", label: "Project Exists in Projects", group: "Time Entry" },
  { value: "opportunity_record_type", label: "Opportunity Record Type", group: "Project" },
  { value: "has_revenue", label: "Has Revenue", group: "Project" },
  { value: "stage", label: "Project Stage", group: "Project" },
  { value: "office", label: "Project Office", group: "Project" },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  has_project_code: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  project_in_projects: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  has_revenue: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  opportunity_record_type: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
  ],
  stage: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
  ],
  office: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
  ],
};

const BOOLEAN_FIELDS = new Set(["has_project_code", "project_in_projects", "has_revenue"]);

// ── Types ──────────────────────────────────────────
type Condition = {
  id?: string;
  field: string;
  operator: string;
  value: string;
  logic_operator: "and" | "or";
};

type Rule = {
  id: string;
  name: string;
  is_billable: boolean;
  priority: number;
  conditions: Condition[];
};

// ── Component ──────────────────────────────────────
const BillableWorkPage = () => {
  const queryClient = useQueryClient();

  // Draft rule state
  const [draftName, setDraftName] = useState("New Rule");
  const [draftIsBillable, setDraftIsBillable] = useState(true);
  const [draftConditions, setDraftConditions] = useState<Condition[]>([
    { field: "has_project_code", operator: "is_true", value: "", logic_operator: "and" },
  ]);

  // Edit state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsBillable, setEditIsBillable] = useState(true);
  const [editConditions, setEditConditions] = useState<Condition[]>([]);

  // ── Queries ────────────────────────────────────
  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: async () => {
      const { data: rulesData, error: rErr } = await supabase
        .from("billability_rules")
        .select("*")
        .order("priority", { ascending: true });
      if (rErr) throw rErr;

      const { data: conditionsData, error: cErr } = await supabase
        .from("billability_rule_conditions")
        .select("*")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (cErr) throw cErr;

      const condsByRule = new Map<string, Condition[]>();
      for (const c of conditionsData) {
        if (!condsByRule.has(c.rule_id)) condsByRule.set(c.rule_id, []);
        condsByRule.get(c.rule_id)!.push({ id: c.id, field: c.field, operator: c.operator, value: c.value, logic_operator: (c as any).logic_operator || "and" });
      }

      return rulesData.map((r: any) => ({
        id: r.id,
        name: r.name,
        is_billable: r.is_billable,
        priority: r.priority,
        conditions: condsByRule.get(r.id) || [],
      })) as Rule[];
    },
  });

  const { data: distinctValues = {} } = useQuery({
    queryKey: ["project_distinct_values"],
    queryFn: async () => {
      const allProjects: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("opportunity_record_type, stage, office")
          .range(from, from + 999);
        if (error) throw error;
        allProjects.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return {
        opportunity_record_type: [...new Set(allProjects.map(p => p.opportunity_record_type).filter(Boolean) as string[])].sort(),
        stage: [...new Set(allProjects.map(p => p.stage).filter(Boolean) as string[])].sort(),
        office: [...new Set(allProjects.map(p => p.office).filter(Boolean) as string[])].sort(),
      };
    },
  });

  // ── Mutations ──────────────────────────────────
  const addRule = useMutation({
    mutationFn: async () => {
      // Validate conditions
      for (const c of draftConditions) {
        if (!BOOLEAN_FIELDS.has(c.field) && !c.value.trim()) {
          throw new Error(`Value required for "${fieldLabel(c.field)}" condition`);
        }
      }
      if (draftConditions.length === 0) throw new Error("At least one condition is required");

      // Insert rule
      const { data: rule, error: rErr } = await supabase
        .from("billability_rules")
        .insert({ name: draftName, is_billable: draftIsBillable, priority: rules.length })
        .select()
        .single();
      if (rErr) throw rErr;

      // Insert conditions
      const conditionRows = draftConditions.map(c => ({
        rule_id: rule.id,
        field: c.field,
        operator: c.operator,
        value: BOOLEAN_FIELDS.has(c.field) ? "" : c.value.trim(),
        logic_operator: c.logic_operator,
      }));
      const { error: cErr } = await supabase.from("billability_rule_conditions").insert(conditionRows);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billability_rules_full"] });
      setDraftName("New Rule");
      setDraftIsBillable(true);
      setDraftConditions([{ field: "has_project_code", operator: "is_true", value: "", logic_operator: "and" }]);
      toast.success("Rule added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      // Conditions cascade-deleted via FK
      const { error } = await supabase.from("billability_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billability_rules_full"] });
      toast.success("Rule deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBillable = useMutation({
    mutationFn: async ({ id, is_billable }: { id: string; is_billable: boolean }) => {
      const { error } = await supabase.from("billability_rules").update({ is_billable }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billability_rules_full"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveRule = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = rules.findIndex(r => r.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rules.length) return;
      await supabase.from("billability_rules").update({ priority: swapIdx }).eq("id", rules[idx].id);
      await supabase.from("billability_rules").update({ priority: idx }).eq("id", rules[swapIdx].id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billability_rules_full"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRule = useMutation({
    mutationFn: async () => {
      if (!editingRuleId) return;
      for (const c of editConditions) {
        if (!BOOLEAN_FIELDS.has(c.field) && !c.value.trim()) {
          throw new Error(`Value required for "${fieldLabel(c.field)}" condition`);
        }
      }
      if (editConditions.length === 0) throw new Error("At least one condition is required");

      const { error: rErr } = await supabase
        .from("billability_rules")
        .update({ name: editName, is_billable: editIsBillable })
        .eq("id", editingRuleId);
      if (rErr) throw rErr;

      // Delete old conditions, insert new
      const { error: dErr } = await supabase
        .from("billability_rule_conditions")
        .delete()
        .eq("rule_id", editingRuleId);
      if (dErr) throw dErr;

      const conditionRows = editConditions.map(c => ({
        rule_id: editingRuleId,
        field: c.field,
        operator: c.operator,
        value: BOOLEAN_FIELDS.has(c.field) ? "" : c.value.trim(),
        logic_operator: c.logic_operator,
      }));
      const { error: cErr } = await supabase.from("billability_rule_conditions").insert(conditionRows);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billability_rules_full"] });
      setEditingRuleId(null);
      toast.success("Rule updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Helpers ────────────────────────────────────
  const fieldLabel = (field: string) => FIELD_OPTIONS.find(f => f.value === field)?.label || field;
  const operatorLabel = (field: string, op: string) =>
    OPERATOR_OPTIONS[field]?.find(o => o.value === op)?.label || op;

  const getSuggestions = (field: string): string[] => (distinctValues as any)[field] || [];

  const updateDraftCondition = (idx: number, updates: Partial<Condition>) => {
    setDraftConditions(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const updated = { ...c, ...updates };
      if (updates.field && updates.field !== c.field) {
        const ops = OPERATOR_OPTIONS[updates.field];
        updated.operator = ops?.[0]?.value || "equals";
        updated.value = "";
      }
      return updated;
    }));
  };

  const updateEditCondition = (idx: number, updates: Partial<Condition>) => {
    setEditConditions(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const updated = { ...c, ...updates };
      if (updates.field && updates.field !== c.field) {
        const ops = OPERATOR_OPTIONS[updates.field];
        updated.operator = ops?.[0]?.value || "equals";
        updated.value = "";
      }
      return updated;
    }));
  };

  const addDraftCondition = () => {
    const usedFields = new Set(draftConditions.map(c => c.field));
    const available = FIELD_OPTIONS.find(f => !usedFields.has(f.value));
    const field = available?.value || "has_project_code";
    const ops = OPERATOR_OPTIONS[field];
    setDraftConditions(prev => [...prev, { field, operator: ops?.[0]?.value || "equals", value: "", logic_operator: "and" }]);
  };

  const addEditCondition = () => {
    const usedFields = new Set(editConditions.map(c => c.field));
    const available = FIELD_OPTIONS.find(f => !usedFields.has(f.value));
    const field = available?.value || "has_project_code";
    const ops = OPERATOR_OPTIONS[field];
    setEditConditions(prev => [...prev, { field, operator: ops?.[0]?.value || "equals", value: "", logic_operator: "and" }]);
  };

  const removeDraftCondition = (idx: number) => {
    setDraftConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const removeEditCondition = (idx: number) => {
    setEditConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const startEditing = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setEditName(rule.name);
    setEditIsBillable(rule.is_billable);
    setEditConditions(rule.conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value, logic_operator: c.logic_operator || "and" })));
  };

  const describeCondition = (c: Condition) => {
    if (BOOLEAN_FIELDS.has(c.field)) {
      return `${fieldLabel(c.field)} ${operatorLabel(c.field, c.operator)}`;
    }
    return `${fieldLabel(c.field)} ${operatorLabel(c.field, c.operator)} "${c.value}"`;
  };

  const renderConditionRow = (
    cond: Condition,
    idx: number,
    conditions: Condition[],
    onUpdate: (idx: number, updates: Partial<Condition>) => void,
    onRemove: (idx: number) => void,
  ) => {
    const isBool = BOOLEAN_FIELDS.has(cond.field);
    const suggestions = getSuggestions(cond.field);
    return (
      <div key={idx} className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-md p-2">
        {idx > 0 && (
          <Select value={cond.logic_operator} onValueChange={(v: "and" | "or") => onUpdate(idx, { logic_operator: v })}>
            <SelectTrigger className="w-[80px] h-7 text-xs font-medium"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="and">AND</SelectItem>
              <SelectItem value="or">OR</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={cond.field} onValueChange={v => onUpdate(idx, { field: v })}>
          <SelectTrigger className="w-[220px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={cond.operator} onValueChange={v => onUpdate(idx, { operator: v })}>
          <SelectTrigger className="w-[150px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(OPERATOR_OPTIONS[cond.field] || []).map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {!isBool && (
          suggestions.length > 0 ? (
            <Select value={cond.value} onValueChange={v => onUpdate(idx, { value: v })}>
              <SelectTrigger className="w-[220px] bg-background"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {suggestions.map(v => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          ) : (
            <Input className="w-[220px] bg-background" value={cond.value} onChange={e => onUpdate(idx, { value: e.target.value })} placeholder="Enter value..." />
          )
        )}
        {conditions.length > 1 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemove(idx)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Billable Work</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define compound rules to classify time entries as billable or non-billable. Entries are <strong>non-billable by default</strong>.
        </p>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="report">Classification Report</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
        {/* Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Each rule contains <strong>multiple conditions</strong> combined with <strong>AND</strong> or <strong>OR</strong> logic.</p>
                <p>Rules are evaluated in priority order. The <strong>first matching rule</strong> wins. If no rule matches → non-billable.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rule Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Create Rule</CardTitle>
            <CardDescription>Combine multiple conditions to define when time entries are billable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rule name + result */}
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Rule Name</label>
                <Input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Billable client work" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Result when conditions match</label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={draftIsBillable} onCheckedChange={setDraftIsBillable} />
                  <Badge variant={draftIsBillable ? "default" : "secondary"}>
                    {draftIsBillable ? "Billable" : "Non-billable"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Conditions</label>
              <div className="space-y-2">
                {draftConditions.map((cond, idx) => renderConditionRow(cond, idx, draftConditions, updateDraftCondition, removeDraftCondition))}
              </div>
              <Button variant="outline" size="sm" onClick={addDraftCondition}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Condition
              </Button>
            </div>

            <Button onClick={() => addRule.mutate()} className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Save Rule
            </Button>
          </CardContent>
        </Card>

        {/* Active Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Active Rules</CardTitle>
            <CardDescription>{rules.length} rule{rules.length !== 1 ? "s" : ""} · evaluated top to bottom · first match wins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No rules defined yet. All time entries will be treated as non-billable.
              </p>
            )}
            {rules.map((rule, idx) => (
              <div key={rule.id} className="border rounded-lg p-4 space-y-2">
                {editingRuleId === rule.id ? (
                  // ── Edit mode ──
                  <div className="space-y-4">
                    <div className="flex items-end gap-4 flex-wrap">
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-muted-foreground">Rule Name</label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Result</label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch checked={editIsBillable} onCheckedChange={setEditIsBillable} />
                          <Badge variant={editIsBillable ? "default" : "secondary"}>
                            {editIsBillable ? "Billable" : "Non-billable"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Conditions</label>
                      <div className="space-y-2">
                        {editConditions.map((cond, ci) => renderConditionRow(cond, ci, editConditions, updateEditCondition, removeEditCondition))}
                      </div>
                      <Button variant="outline" size="sm" onClick={addEditCondition}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Condition
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateRule.mutate()}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save Changes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingRuleId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ──
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0}
                            onClick={() => moveRule.mutate({ id: rule.id, direction: "up" })}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === rules.length - 1}
                            onClick={() => moveRule.mutate({ id: rule.id, direction: "down" })}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium">{rule.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_billable}
                            onCheckedChange={(checked) => toggleBillable.mutate({ id: rule.id, is_billable: checked })}
                          />
                          <Badge variant={rule.is_billable ? "default" : "secondary"}>
                            {rule.is_billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => startEditing(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="pl-14 flex flex-wrap gap-1.5">
                      {rule.conditions.map((c, ci) => (
                        <span key={c.id || ci} className="inline-flex items-center gap-1">
                          {ci > 0 && <span className="text-xs text-muted-foreground font-medium mx-1">{(c.logic_operator || "and").toUpperCase()}</span>}
                          <Badge variant="outline" className="text-xs font-normal">
                            {describeCondition(c)}
                          </Badge>
                        </span>
                      ))}
                      {rule.conditions.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No conditions (always matches)</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="report">
          <UnmatchedEntriesReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillableWorkPage;
