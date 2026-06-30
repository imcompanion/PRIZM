import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient("https://hyfgyfuvligacjwxjnce.supabase.co", "sb_secret_GNp6xr3aVo_IggfTL-H3Fg_sVSCFvv3");

async function run() {
  const { data: peopleRaw, error } = await supabase.from("people").select("*, roles(name, billable_capacity_hours)");
  if (error) { console.error(error); return; }
  
  let totalExpected = 0;
  let totalExpectedBillable = 0;
  
  for (const person of peopleRaw) {
    const role = person.roles;
    const billableCapacityHrs = role?.billable_capacity_hours != null 
        ? role.billable_capacity_hours / 5 
        : 7.5;
    
    // just assume 5 days for everyone to test the ratio
    totalExpected += 5 * 7.5;
    totalExpectedBillable += 5 * billableCapacityHrs;
  }
  
  console.log("Total Expected:", totalExpected);
  console.log("Total Expected Billable:", totalExpectedBillable);
  console.log("Expected Utilisation:", (totalExpectedBillable / totalExpected) * 100);
}

run();
