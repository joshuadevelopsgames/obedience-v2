export const dynamic = "force-dynamic";

export async function GET() {
  // VERCEL_GIT_COMMIT_SHA is auto-set by Vercel on every deploy.
  // Falls back to "dev" locally so the hook never triggers in development.
  const version = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
  return Response.json({ version });
}
