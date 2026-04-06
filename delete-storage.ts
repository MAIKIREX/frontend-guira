import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deleteUserStorageFiles(userId: string, bucket: string) {
  console.log(`Searching files for user ${userId} in bucket ${bucket}...`);
  
  const { data: files, error } = await supabase.storage.from(bucket).list(userId);
  if (error) {
    console.error("Error listing files:", error);
    return;
  }
  
  if (!files || files.length === 0) {
    console.log("No files found.");
    return;
  }

  const filePaths = files.map(file => `${userId}/${file.name}`);
  console.log("Found files:", filePaths);

  const { data, error: delError } = await supabase.storage.from(bucket).remove(filePaths);
  
  if (delError) {
    console.error("Error deleting files:", delError);
  } else {
    console.log("Deleted files successfully.");
  }
}

async function run() {
  await deleteUserStorageFiles('40a503f7-c05d-478e-89db-621955f2f203', 'kyc-documents');
}

run();
