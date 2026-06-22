const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl } = await req.json();
    if (!sheetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sheet URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract spreadsheet ID from various Google Sheets URL formats
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spreadsheetId = match[1];
    const sheetName = 'Time Machine Output';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    console.log('Fetching sheet:', csvUrl);

    const response = await fetch(csvUrl);
    if (!response.ok) {
      const text = await response.text();
      console.error('Google Sheets error:', text);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch sheet (${response.status}). Make sure the sheet is shared as "Anyone with the link".` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await response.text();
    
    // Parse CSV and limit to columns A-I (indices 0-8)
    const rawRows = parseCSV(csvText);
    const MAX_COL = 9; // A through I
    const rows = rawRows.map(r => r.slice(0, MAX_COL));
    console.log('Parsed rows:', rows.length, 'First 6 rows:', JSON.stringify(rows.slice(0, 6)));

    if (rows.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sheet does not have enough data rows' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find rows by label – search ALL columns, not just column A
    let rateCardName = '';
    let discount = 0;
    let rateCardCurrency = '';
    let fxLockDate = '';
    let headerRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      for (let c = 0; c < rows[i].length; c++) {
        const label = (rows[i][c] || '').trim().toLowerCase();
        if (label === 'rate card' && !rateCardName) {
          rateCardName = (rows[i][c + 1] || '').trim();
          console.log('Found Rate Card at row', i, 'col', c, ':', JSON.stringify(rows[i]));
        } else if (label === 'rate card discount' && discount === 0) {
          const discountStr = (rows[i][c + 1] || '').trim().replace('%', '');
          discount = parseFloat(discountStr) || 0;
          console.log('Found Discount at row', i, 'col', c, ':', JSON.stringify(rows[i]));
        } else if (label === 'rate card currency' && !rateCardCurrency) {
          rateCardCurrency = (rows[i][c + 1] || '').trim().toUpperCase();
          console.log('Found Rate Card Currency at row', i, 'col', c, ':', rateCardCurrency);
        } else if (label === 'fx lock date' && !fxLockDate) {
          fxLockDate = (rows[i][c + 1] || '').trim();
          console.log('Found FX Lock Date at row', i, 'col', c, ':', fxLockDate);
        } else if (label === 'roles' && headerRowIndex < 0) {
          headerRowIndex = i;
          console.log('Found Roles header at row', i, 'col', c, ':', JSON.stringify(rows[i]));
          break;
        }
      }
      if (headerRowIndex >= 0) break;
    }

    if (headerRowIndex < 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not find "Roles" header row in the sheet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read phase names from header row
    const headerRow = rows[headerRowIndex];
    const headerPhases = headerRow.slice(2).map((h: string) => h.trim()).filter(Boolean);
    const phaseNames = headerPhases.length > 0
      ? headerPhases
      : ['Set Up', 'RTB', 'Creators & Contracting', 'Content Creation', 'Go Live', 'Reporting & Wrap Up', 'N/A'];

    const roleRows: Array<{
      roleName: string;
      totalHours: number;
      phaseHours: Record<string, number>;
    }> = [];

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const cells = rows[i];
      const roleName = cells[0]?.trim();
      if (!roleName) continue;

      const totalHours = parseFloat(cells[1]) || 0;
      const phaseHours: Record<string, number> = {};
      for (let j = 0; j < phaseNames.length; j++) {
        phaseHours[phaseNames[j]] = parseFloat(cells[j + 2]) || 0;
      }

      roleRows.push({ roleName, totalHours, phaseHours });
    }

    // Fetch FX rates if a different currency is specified
    let fxRates: { gbp: number; usd: number } | null = null;
    if (rateCardCurrency && rateCardCurrency !== 'GBP') {
      // Parse FX lock date - try various formats
      let lockDate = '';
      if (fxLockDate) {
        // Try to parse as a date and format as YYYY-MM-DD
        const parsed = new Date(fxLockDate);
        if (!isNaN(parsed.getTime())) {
          lockDate = parsed.toISOString().split('T')[0];
        }
      }
      
      try {
        // Fetch GBP → target currency rate
        const gbpUrl = lockDate
          ? `https://api.frankfurter.app/${lockDate}?from=GBP&to=${rateCardCurrency}`
          : `https://api.frankfurter.app/latest?from=GBP&to=${rateCardCurrency}`;
        const usdUrl = lockDate
          ? `https://api.frankfurter.app/${lockDate}?from=USD&to=${rateCardCurrency}`
          : `https://api.frankfurter.app/latest?from=USD&to=${rateCardCurrency}`;
        
        const [gbpRes, usdRes] = await Promise.all([fetch(gbpUrl), fetch(usdUrl)]);
        
        if (gbpRes.ok && usdRes.ok) {
          const gbpData = await gbpRes.json();
          const usdData = await usdRes.json();
          fxRates = {
            gbp: gbpData.rates?.[rateCardCurrency] || 1,
            usd: usdData.rates?.[rateCardCurrency] || 1,
          };
          console.log('FX rates fetched:', fxRates, 'for date:', lockDate || 'latest');
        } else {
          console.error('FX rate fetch failed:', await gbpRes.text(), await usdRes.text());
        }
      } catch (fxErr) {
        console.error('FX rate fetch error:', fxErr);
      }
    } else if (rateCardCurrency === 'GBP' || !rateCardCurrency) {
      // No conversion needed for GBP, but still fetch USD→GBP for US staff
      // Actually if project is in GBP, USD staff costs need USD→GBP
      // We'll handle this on the frontend; only fetch if non-GBP
    }

    console.log('Rate card:', rateCardName, 'Discount:', discount, 'Currency:', rateCardCurrency, 'Roles:', roleRows.length);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          rateCardName,
          discount,
          rateCardCurrency,
          fxLockDate,
          fxRates,
          phaseNames,
          roles: roleRows,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        fields.push(current);
        current = '';
        rows.push(fields);
        fields = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || fields.length > 0) {
    fields.push(current);
    rows.push(fields);
  }
  return rows;
}
