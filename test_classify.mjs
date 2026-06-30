import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hyfgyfuvligacjwxjnce.supabase.co";
const SUPABASE_KEY = "sb_secret_GNp6xr3aVo_IggfTL-H3Fg_sVSCFvv3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function evaluateCondition(cond, entry, projectExists) {
  switch (cond.field) {
    case "has_project_code": {
      const pCodeExists = !!entry.project_id;
      return cond.operator === "is_true" ? pCodeExists : !pCodeExists;
    }
    case "project_in_projects": {
      const pInDb = projectExists && !!entry.project_id;
      return cond.operator === "is_true" ? pInDb : !pInDb;
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

function evaluateRule(rule, entry, projectExists) {
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

function classifyEntry(rules, entry, projectExists) {
  for (const rule of rules) {
    if (evaluateRule(rule, entry, projectExists)) {
      return { result: rule.is_billable ? "billable" : "non-billable", matchedRule: rule };
    }
  }
  return { result: "unmatched" };
}

async function fetchRulesWithConditions() {
  const { data: rulesData } = await supabase.from("billability_rules").select("*").order("priority", { ascending: true });
  const { data: conditionsData } = await supabase.from("billability_rule_conditions").select("*").order("created_at", { ascending: true }).order("id", { ascending: true });

  const condsByRule = new Map();
  for (const c of conditionsData) {
    if (!condsByRule.has(c.rule_id)) condsByRule.set(c.rule_id, []);
    condsByRule.get(c.rule_id).push({
      field: c.field,
      operator: c.operator,
      value: c.value,
      logic_operator: c.logic_operator || "and",
    });
  }

  return rulesData.map((r) => ({
    id: r.id,
    name: r.name,
    is_billable: r.is_billable,
    priority: r.priority,
    conditions: condsByRule.get(r.id) || [],
  }));
}

async function run() {
  const rules = await fetchRulesWithConditions();
  
  const fetchAllData = async (table, columns) => {
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
  
  const projectsRaw = await fetchAllData("projects", "id, title, opportunity_record_type, revenue, stage, office");
  const projectsMap = new Map();
  for (const p of projectsRaw) projectsMap.set(p.id, p);

  const projectIdsRaw = await fetchAllData("projects", "id");
  const projectIds = new Set(projectIdsRaw.map(p => p.id));

  const { data: utilisationSummary, error } = await supabase.rpc("get_utilisation_summary", {
    _start_date: "2026-01-01",
    _end_date: "2026-12-31"
  });
  if (error) {
    console.error("RPC Error:", error);
    return;
  }
  if (!utilisationSummary) {
    console.log("No data returned from RPC");
    return;
  }
  
  console.log("Returned rows:", utilisationSummary.length);
  if (utilisationSummary.length > 0) {
    console.log("Sample:", utilisationSummary[0]);
  }

  let totalHours = 0;
  let totalBillable = 0;

  for (const row of utilisationSummary) {
    if (!row.person_id) continue;
    const nonLeaveHrs = Number(row.total_hours) - Number(row.leave_hours);
    totalHours += nonLeaveHrs;

    if (nonLeaveHrs > 0) {
      const proj = projectsMap.get(row.project_id);
      const entryForClassification = {
        project_id: row.project_id,
        projects: proj || null,
      };
      const projectExists = projectIds.has(row.project_id);
      const { result, matchedRule } = classifyEntry(rules, entryForClassification, projectExists);
      
      if (result === "billable") {
        totalBillable += nonLeaveHrs;
      } else if (nonLeaveHrs > 0 && Math.random() < 0.05) {
        console.log("NON-BILLABLE:", {
          projectId: row.project_id,
          title: proj?.title,
          revenue: proj?.revenue,
          stage: proj?.stage,
          opp_type: proj?.opportunity_record_type,
          result: result,
          matchedRule: matchedRule?.name || "unmatched"
        });
      }
    }
  }

  console.log(`Total Hours: ${totalHours}`);
  console.log(`Total Billable: ${totalBillable}`);
}

run().catch(console.error);
