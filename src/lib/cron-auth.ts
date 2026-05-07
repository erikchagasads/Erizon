export function isCronAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const vercelCron = req.headers.get("x-vercel-cron");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (vercelCron === "1" || vercelCron === "true") return true;

  return false;
}
