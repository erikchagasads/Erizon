// Placeholder edge function for monitor-cpl.
// Replace with real implementation before deploy.
Deno.serve(() => {
  return new Response(JSON.stringify({ ok: true, message: "monitor-cpl placeholder" }), {
    headers: { "content-type": "application/json" },
  });
});
