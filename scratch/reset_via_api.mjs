/**
 * Reset password via better-auth admin API.
 * Runs against the live production API.
 */
async function main() {
  const userId = '38YmJtQEQiZkRKBLue2WffNCCVyOlg2r';
  const newPassword = 'Gordinh@29';
  const apiBase = 'https://standard-api.bekaa.eu';

  // Step 1: Get an admin token by signing in with the API key or admin route
  // Use the admin setUserPassword endpoint
  console.log('Trying admin setUserPassword...');
  
  const res = await fetch(`${apiBase}/api/auth/admin/set-user-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ADMIN_API_KEY || '' },
    body: JSON.stringify({ userId, newPassword })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

main().catch(console.error);
