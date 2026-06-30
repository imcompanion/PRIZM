require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Clear the table first
  console.log('Clearing old emails...');
  await supabase.from('app_users').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  const emailsToAdd = [
    'pwebb@billiondollarboy.com',
    'innovations@billiondollarboy.com',
    'jbrazier@billiondollarboy.com'
  ];

  for (const email of emailsToAdd) {
    const { data, error } = await supabase.from('app_users').insert([
      { email, role: 'admin', added_by: 'system' }
    ]);
    if (error) {
      console.error('Error adding admin:', email, error.message);
    } else {
      console.log(`Successfully added ${email} as admin!`);
    }
  }
}

main();
