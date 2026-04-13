const BASE_URL = 'https://v45n2nsn.us-east.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDg0MjB9.DJietXfXiZrjUXMxpsJ09v4eAgIFwKHkux2Y2fBtvAk';
const API_KEY = 'ik_b016cb4ca46064ae8ce474e08003e2be';

async function signUpUser(email, password, name) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ email, password, name })
  });
  return res.json();
}

async function verifyEmail(email, otp) {
  const res = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ email, otp })
  });
  return res.json();
}

async function main() {
  // Temporarily disable email verification via admin API
  console.log('Disabling email verification temporarily...');
  const configRes = await fetch(`${BASE_URL}/api/auth/config`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ requireEmailVerification: false })
  });
  console.log('Config update:', await configRes.json());

  // Create admin user
  console.log('\nCreating admin user...');
  const adminResult = await signUpUser('admin@fincatigrillo.com', 'Admin2026!', 'Admin Tigrillo');
  console.log('Admin result:', JSON.stringify(adminResult, null, 2));

  // Create viewer user
  console.log('\nCreating viewer user...');
  const viewerResult = await signUpUser('viewer@fincatigrillo.com', 'Viewer2026!', 'Estudiante Demo');
  console.log('Viewer result:', JSON.stringify(viewerResult, null, 2));

  // Re-enable email verification
  console.log('\nRe-enabling email verification...');
  const reEnableRes = await fetch(`${BASE_URL}/api/auth/config`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ requireEmailVerification: true })
  });
  console.log('Config restored:', await reEnableRes.json());

  // Now create user_profiles with roles
  // We need the user IDs from signup results
  const adminId = adminResult?.user?.id || adminResult?.data?.user?.id;
  const viewerId = viewerResult?.user?.id || viewerResult?.data?.user?.id;

  console.log('\nAdmin ID:', adminId);
  console.log('Viewer ID:', viewerId);

  if (adminId) {
    console.log('\nSetting admin profile...');
    const profileRes = await fetch(`${BASE_URL}/api/database/user_profiles`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{ user_id: adminId, role: 'admin', full_name: 'Admin Tigrillo' }])
    });
    console.log('Admin profile:', await profileRes.json());
  }

  if (viewerId) {
    console.log('\nSetting viewer profile...');
    const profileRes = await fetch(`${BASE_URL}/api/database/user_profiles`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{ user_id: viewerId, role: 'viewer', full_name: 'Estudiante Demo' }])
    });
    console.log('Viewer profile:', await profileRes.json());
  }
}

main().catch(console.error);
