export async function managementResponse(response) {
  if (response.status === 204) return {};
  try { return await response.json(); }
  catch { throw new Error('The local sign-in service is unavailable.'); }
}
