import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────
export type Condition = {
  field: string;
  operator: string;
  value: string;
  logic_operator: "and" | "or";
};

export type Rule = {
  id: string;
  name: string;
  is_billable: boolean;
  priority: number;
  conditions: Condition[];
};

export type TimeEntryForClassification = {
  id: string;
  date: string;
  hours: number;
  notes: string | null;
  project_id: string | null;
  person_id: string;
  people: { name: string; roles: { name: string } | null } | null;
  projects: { title: string; opportunity_record_type: string | null; revenue: number | null; stage: string | null; office: string | null } | null;
};

export type MatchResult = "billable" | "non-billable" | "unmatched";

// ── Rule evaluation ─────────────────────────────
function evaluateCondition(cond: Condition, entry: TimeEntryForClassification, projectExists: boolean): boolean {
  switch (cond.field) {
    case "has_project_code": {
      const has = entry.project_id !== null;
      return cond.operator === "is_true" ? has : !has;
    }
    case "project_in_projects": {
      const exists = projectExists && entry.project_id !== null;
      return cond.operator === "is_true" ? exists : !exists;
    }
    case "has_revenue": {
      const has = entry.projects?.revenue != null && entry.projects.revenue > 0;
      return cond.operator === "is_true" ? has : !has;
    }
    case "opportunity_record_type": {
      const val = entry.projects?.opportunity_record_type || "";
      if (cond.operator === "equals") return val === cond.value;
      if (cond.operator === "not_equals") return val !== cond.value;
      if (cond.operator === "contains") return val.toLowerCase().includes(cond.value.toLowerCase());
      return false;
    }
    case "stage": {
      const val = entry.projects?.stage || "";
      if (cond.operator === "equals") return val === cond.value;
      if (cond.operator === "not_equals") return val !== cond.value;
      return false;
    }
    case "office": {
      const val = entry.projects?.office || "";
      if (cond.operator === "equals") return val === cond.value;
      if (cond.operator === "not_equals") return val !== cond.value;
      return false;
    }
    default:
      return false;
  }
}

function evaluateRule(rule: Rule, entry: TimeEntryForClassification, projectExists: boolean): boolean {
  if (rule.conditions.length === 0) return true;
  let result = evaluateCondition(rule.conditions[0], entry, projectExists);
  for (let i = 1; i < rule.conditions.length; i++) {
    const cond = rule.conditions[i];
    const condResult = evaluateCondition(cond, entry, projectExists);
    if (cond.logic_operator === "or") {
      result = result || condResult;
    } else {
      result = result && condResult;
    }
  }
  return result;
}

export function classifyEntry(rules: Rule[], entry: TimeEntryForClassification, projectExists: boolean): { result: MatchResult; matchedRule?: Rule } {
  for (const rule of rules) {
    if (evaluateRule(rule, entry, projectExists)) {
      return { result: rule.is_billable ? "billable" : "non-billable", matchedRule: rule };
    }
  }
  return { result: "unmatched" };
}

// ── Shared data fetchers ────────────────────────
export async function fetchRulesWithConditions(): Promise<Rule[]> {
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
    condsByRule.get(c.rule_id)!.push({
      field: c.field,
      operator: c.operator,
      value: c.value,
      logic_operator: (c as any).logic_operator || "and",
    });
  }

  return rulesData.map((r: any) => ({
    id: r.id,
    name: r.name,
    is_billable: r.is_billable,
    priority: r.priority,
    conditions: condsByRule.get(r.id) || [],
  }));
}

export const BILLABILITY_PROJECTS_QUERY_KEY = ["projects_for_billability_v3"] as const;
export const BILLABILITY_PROJECT_IDS_QUERY_KEY = ["project_ids_set_v2"] as const;

export type ProjectForBillability = {
  id: string;
  title: string;
  opportunity_record_type: string | null;
  revenue: number | null;
  stage: string | null;
  office: string | null;
};

export async function fetchProjectIdSet(): Promise<string[]> {
  const allIds: string[] = [];
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allIds.push(...data.map(p => p.id));
    if (data.length < batchSize) break;
    offset += batchSize;
  }
  return allIds;
}

export async function fetchProjectsForBillability(): Promise<ProjectForBillability[]> {
  const allProjects: ProjectForBillability[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, opportunity_record_type, revenue, stage, office")
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allProjects.push(...(data as ProjectForBillability[]));
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return allProjects;
}
