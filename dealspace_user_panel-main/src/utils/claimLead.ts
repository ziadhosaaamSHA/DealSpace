export async function claimPerson(personId: number) {
  const res = await fetch(`/api/people/${personId}/claim=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // include auth headers if required (token, CSRF)
    },
    credentials: 'include'
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to claim person');
  }

  return res.json();
}