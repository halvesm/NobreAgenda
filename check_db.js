import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfmtmvcfevxopuaqwukh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXRtdmNmZXZ4b3B1YXF3dWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDE0NzEsImV4cCI6MjA4Mjc3NzQ3MX0.gJxmVgErW7EGzBfxqCsCaqPTLVF8LQ7uKdsXDNy_Ah4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Checking a sample booking...");
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (bookings && bookings.length > 0) {
    console.log("Booking keys:", Object.keys(bookings[0]));
    console.log("space_id type:", typeof bookings[0].space_id, bookings[0].space_id);
  } else {
    console.log("No bookings found.");
  }
}

run();
