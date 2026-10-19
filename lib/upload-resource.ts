export function uploadFolder(event: { slug: string; access_mode: string }, testRunId?: string | null) {
  return testRunId ? `weddings/${event.slug}/test/${testRunId}` : `weddings/${event.slug}/${event.access_mode === "public_qr" ? "public" : "table"}`;
}

export function uploadResourceId(event: { slug: string; access_mode: string }, authorization: { public_id: string; test_run_id?: string | null }) {
  const folder = uploadFolder(event, authorization.test_run_id);
  return authorization.public_id.startsWith(`${folder}/`) ? authorization.public_id : `${folder}/${authorization.public_id}`;
}
