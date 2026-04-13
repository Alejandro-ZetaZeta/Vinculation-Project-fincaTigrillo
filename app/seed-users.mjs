import { createClient } from '@insforge/sdk';

const BASE_URL = 'https://v45n2nsn.us-east.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDg0MjB9.DJietXfXiZrjUXMxpsJ09v4eAgIFwKHkux2Y2fBtvAk';
const API_KEY = 'ik_b016cb4ca46064ae8ce474e08003e2be';

const insforge = createClient({
  baseUrl: BASE_URL,
  anonKey: ANON_KEY
});

async function main() {
  // Temporarily disable email verification
  console.log('Disabling email verification temporarily...');
  const configRes = await fetch(`${BASE_URL}/api/auth/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ requireEmailVerification: false })
  });
  console.log('Config:', (await configRes.json()).requireEmailVerification);

  // Create admin user
  console.log('\nCreating admin user...');
  const { data: adminData, error: adminError } = await insforge.auth.signUp({
    email: 'admin@fincatigrillo.com',
    password: 'Admin2026!',
    name: 'Admin Tigrillo'
  });
  if (adminError) console.log('Admin error:', adminError.message);
  else console.log('Admin created, ID:', adminData?.user?.id);

  // Sign out admin session
  await insforge.auth.signOut();

  // Create viewer user
  console.log('\nCreating viewer user...');
  const { data: viewerData, error: viewerError } = await insforge.auth.signUp({
    email: 'viewer@fincatigrillo.com',
    password: 'Viewer2026!',
    name: 'Estudiante Demo'
  });
  if (viewerError) console.log('Viewer error:', viewerError.message);
  else console.log('Viewer created, ID:', viewerData?.user?.id);

  // Re-enable email verification
  console.log('\nRe-enabling email verification...');
  await fetch(`${BASE_URL}/api/auth/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ requireEmailVerification: true })
  });
  console.log('Email verification re-enabled');

  // Create profiles with admin API key
  const adminId = adminData?.user?.id;
  const viewerId = viewerData?.user?.id;

  if (adminId) {
    console.log('\nSetting admin profile...');
    const r1 = await fetch(`${BASE_URL}/api/database/user_profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Prefer': 'return=representation' },
      body: JSON.stringify([{ user_id: adminId, role: 'admin', full_name: 'Admin Tigrillo' }])
    });
    console.log('Admin profile:', (await r1.json()));
  }

  if (viewerId) {
    console.log('\nSetting viewer profile...');
    const r2 = await fetch(`${BASE_URL}/api/database/user_profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Prefer': 'return=representation' },
      body: JSON.stringify([{ user_id: viewerId, role: 'viewer', full_name: 'Estudiante Demo' }])
    });
    console.log('Viewer profile:', (await r2.json()));
  }

  console.log('\n=== TEST CREDENTIALS ===');
  console.log('Admin: admin@fincatigrillo.com / Admin2026!');
  console.log('Viewer: viewer@fincatigrillo.com / Viewer2026!');
}

main().catch(console.error);
