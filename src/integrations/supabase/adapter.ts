import { 
  listRoles, listProjects, listPeople, listTimeEntries, 
  listProjectPhases, listAllocations, listDataImports, listRateCards
} from "@/dataconnect-generated";
import * as aggregations from "../../lib/aggregations";

class SupabaseQueryBuilder {
  table: string;
  filters: any = {};
  orders: any[] = [];
  isSingle = false;
  rangeParams?: { from: number; to: number };
  
  constructor(table: string) {
    this.table = table;
  }

  range(from: number, to: number) {
    this.rangeParams = { from, to };
    return this;
  }

  select(cols?: string) { return this; }
  
  eq(col: string, val: any) { 
    this.filters[col] = val; 
    return this; 
  }
  
  in(col: string, vals: any[]) {
    this.filters[col] = { in: vals };
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  
  single() {
    this.isSingle = true;
    return this;
  }
  
  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  async upsert(data: any, opts?: any) {
    return { data: null, error: null };
  }
  
  async insert(data: any) {
    return { data: null, error: null };
  }
  
  delete() {
    return {
      in: async (col: string, vals: any[]) => {
        return { data: null, error: null };
      },
      eq: async (col: string, val: any) => {
        return { data: null, error: null };
      },
      neq: async (col: string, val: any) => {
        return { data: null, error: null };
      }
    };
  }

  async then(resolve: any, reject: any) {
    try {
      let data: any[] = [];
      
      if (this.table === 'roles') {
        const res = await listRoles();
        data = res.data.roless;
      } else if (this.table === 'projects') {
        const res = await listProjects();
        data = res.data.projectss;
      } else if (this.table === 'people') {
        const res = await listPeople();
        data = res.data.peoples;
      } else if (this.table === 'rate_cards') {
        const res = await listRateCards();
        data = res.data.rateCardss;
      } else if (this.table === 'time_entries') {
        const res = await listTimeEntries();
        data = res.data.timeEntriess;
      } else if (this.table === 'project_phases') {
        const res = await listProjectPhases();
        data = res.data.projectPhasess;
      } else if (this.table === 'allocations') {
        const res = await listAllocations();
        data = res.data.allocationss;
      } else if (this.table === 'data_imports') {
        const res = await listDataImports();
        data = res.data.dataImportss;
      } else {
        data = [];
      }

      data = data || [];

      for (const [col, val] of Object.entries(this.filters)) {
        if (val && typeof val === 'object' && 'in' in (val as any)) {
          data = data.filter(d => (val as any).in.includes(d[col]));
        } else {
          data = data.filter(d => d[col] === val);
        }
      }

      for (const order of this.orders) {
        data.sort((a, b) => {
          if (a[order.col] < b[order.col]) return order.asc ? -1 : 1;
          if (a[order.col] > b[order.col]) return order.asc ? 1 : -1;
          return 0;
        });
      }

      if (this.isSingle) {
        resolve({ data: data[0] || null, error: null });
      } else {
        if (this.rangeParams) {
          data = data.slice(this.rangeParams.from, this.rangeParams.to + 1);
        }
        resolve({ data, error: null });
      }
    } catch (error) {
      resolve({ data: null, error });
    }
  }
}

class SupabaseRpcBuilder {
  func: string;
  args: any;
  rangeParams?: { from: number; to: number };
  
  constructor(func: string, args: any) {
    this.func = func;
    this.args = args;
  }
  
  range(from: number, to: number) {
    this.rangeParams = { from, to };
    return this;
  }
  
  async then(resolve: any, reject: any) {
    try {
      let data: any = [];
      if (this.func === 'get_project_costs_monthly') {
        data = await aggregations.getProjectCostsMonthly(this.args?._start_date, this.args?._end_date);
      } else if (this.func === 'get_utilisation_summary') {
        data = await aggregations.getUtilisationSummary(this.args?._start_date, this.args?._end_date);
      } else if (this.func === 'relink_time_entries_from_fallbacks') {
        resolve({ data: {}, error: null });
        return;
      }
      
      if (this.rangeParams && Array.isArray(data)) {
        data = data.slice(this.rangeParams.from, this.rangeParams.to + 1);
      }
      resolve({ data, error: null });
    } catch (e) {
      resolve({ data: null, error: e });
    }
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  rpc: (func: string, args?: any) => new SupabaseRpcBuilder(func, args)
};
