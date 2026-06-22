import type { Recommendation } from "./ScopeRecommendations";

/** Tracks per-role overrides from applied recommendations */
export interface LineOverride {
  hours?: number;
  removed?: boolean;
}

/** A map of role (lowercase) → override with TOTAL target hours */
export type OverrideMap = Map<string, LineOverride>;

export function buildOverrideMap(recs: Recommendation[]): OverrideMap {
  const map: OverrideMap = new Map();
  for (const rec of recs) {
    if (rec.type === "remove") {
      for (const role of rec.roles) map.set(role.toLowerCase(), { removed: true });
    } else if (rec.type === "reduce" || rec.type === "increase") {
      for (const role of rec.roles) {
        if (rec.suggestedHours != null) map.set(role.toLowerCase(), { hours: rec.suggestedHours });
      }
    } else if (rec.type === "add") {
      for (const role of rec.roles) {
        map.set(role.toLowerCase(), { hours: rec.suggestedHours ?? 0 });
      }
    } else if (rec.type === "merge") {
      const [keepRole, ...removeRoles] = rec.roles;
      for (const r of removeRoles) map.set(r.toLowerCase(), { removed: true });
      if (rec.suggestedHours != null) map.set(keepRole.toLowerCase(), { hours: rec.suggestedHours });
    }
  }
  return map;
}

/**
 * Build a per-line hours map that distributes total target hours proportionally
 * across all lines for a given role.
 */
export function buildLineHoursMap(
  lines: { task: string; role: string; hours: number; section: string }[],
  overrides: OverrideMap
): Map<string, number> {
  const lineMap = new Map<string, number>();
  const roleLines = new Map<string, { key: string; hours: number }[]>();

  for (const line of lines) {
    const roleKey = line.role.toLowerCase();
    const lineKey = `${line.section}|${line.task}|${line.role}`;
    if (!roleLines.has(roleKey)) roleLines.set(roleKey, []);
    roleLines.get(roleKey)!.push({ key: lineKey, hours: line.hours });
  }

  for (const [roleKey, rLines] of roleLines) {
    const ov = overrides.get(roleKey);
    if (!ov || ov.removed) continue;
    if (ov.hours == null) continue;

    const totalOriginal = rLines.reduce((s, l) => s + l.hours, 0);
    if (totalOriginal === 0) {
      const perLine = ov.hours / rLines.length;
      for (const l of rLines) lineMap.set(l.key, perLine);
    } else {
      for (const l of rLines) {
        lineMap.set(l.key, (l.hours / totalOriginal) * ov.hours);
      }
    }
  }

  return lineMap;
}

/**
 * Apply overrides to task lines, returning adjusted lines.
 * Removed roles are excluded, adjusted roles get new hours.
 * Added roles (not in original lines) are appended.
 */
export function applyOverridesToLines(
  lines: { task: string; role: string; hours: number; section: string; phase: string | null }[],
  recs: Recommendation[]
): typeof lines {
  const overrides = buildOverrideMap(recs);
  const lineHoursMap = buildLineHoursMap(lines, overrides);

  const result: typeof lines = [];

  for (const line of lines) {
    const ov = overrides.get(line.role.toLowerCase());
    if (ov?.removed) continue;
    const lineKey = `${line.section}|${line.task}|${line.role}`;
    const adjustedHours = lineHoursMap.get(lineKey) ?? line.hours;
    result.push({ ...line, hours: adjustedHours });
  }

  // Add new roles from "add" recommendations
  const existingRoles = new Set(lines.map(l => l.role.toLowerCase()));
  for (const [roleKey, ov] of overrides) {
    if (!existingRoles.has(roleKey) && !ov.removed && ov.hours != null && ov.hours > 0) {
      const originalRec = recs.find(r => r.type === "add" && r.roles.some(role => role.toLowerCase() === roleKey));
      const displayRole = originalRec?.roles.find(role => role.toLowerCase() === roleKey) || roleKey;
      result.push({
        task: "Added by Optimiser",
        role: displayRole,
        hours: ov.hours,
        section: "Added",
        phase: null,
      });
    }
  }

  return result;
}
