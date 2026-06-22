import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all rows from a Supabase query, automatically paginating
 * to bypass the 1,000-row default limit.
 *
 * Usage:
 *   const data = await fetchAllRows(
 *     supabase.from("projects").select("id, title").order("id")
 *   );
 */
export async function fetchAllRows<T = any>(
  queryBuilder: any,
  pageSize = 1000
): Promise<T[]> {
  const allData: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}
