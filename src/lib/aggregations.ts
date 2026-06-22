import { listTimeEntries } from "@/dataconnect-generated";

export async function getProjectCostsMonthly(startDate: string, endDate: string) {
  const { data } = await listTimeEntries();
  const entries = data.timeEntriess || [];
  
  const filtered = entries.filter(e => e.date >= startDate && e.date <= endDate);
  
  const results: any = {};
  for (const entry of filtered) {
    const month = entry.date.substring(0, 7) + '-01';
    const key = `${entry.project_id}_${month}`;
    
    if (!results[key]) {
      results[key] = {
        project_id: entry.project_id,
        month_date: month,
        total_hours: 0,
        cost_gbp_staff: 0,
        cost_usd_staff: 0
      };
    }
    
    const hours = entry.hours || 0;
    const hourlyRateGbp = 50; 
    
    results[key].total_hours += hours;
    results[key].cost_gbp_staff += (hours * hourlyRateGbp);
    results[key].cost_usd_staff += (hours * hourlyRateGbp * 1.25);
  }
  
  return Object.values(results);
}

export async function getUtilisationSummary(startDate: string, endDate: string) {
  const { data } = await listTimeEntries();
  const entries = data.timeEntriess || [];
  
  const filtered = entries.filter(e => e.date >= startDate && e.date <= endDate);
  
  const results: any = {};
  for (const entry of filtered) {
    const key = `${entry.person_id}_${entry.project_id}`;
    if (!results[key]) {
      results[key] = {
        person_id: entry.person_id,
        project_id: entry.project_id,
        total_hours: 0,
        leave_hours: 0
      };
    }
    results[key].total_hours += entry.hours || 0;
  }
  
  return Object.values(results);
}
