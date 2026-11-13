import { revalidateTag } from "next/cache";
import { SolutionSchema } from "@/lib/authoring/schemas";
import { contentAdmin, ContentReadOnlyError } from "@/lib/data/store";
import { getAdmin } from "@/lib/session";
import type { Solution } from "@/lib/types";

type Ctx = RouteContext<"/api/admin/problems/[problemId]/solutions/[solutionId]">;

function readOnly(e: unknown) {
  return e instanceof ContentReadOnlyError
    ? Response.json({ error: "read_only", message: e.message }, { status: 409 })
    : null;
}

/** Create or update a solution and its dry run (admins only). */
export async function PUT(request: Request, ctx: Ctx) {
  if (!(await getAdmin())) return Response.json({ error: "forbidden" }, { status: 403 });
  const { problemId, solutionId } = await ctx.params;

  const parsed = SolutionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.id !== solutionId || parsed.data.problemId !== problemId) {
    return Response.json({ error: "id_mismatch" }, { status: 400 });
  }

  const admin = await contentAdmin();
  if (!(await admin.getProblemAny(problemId))) {
    return Response.json({ error: "problem_not_found" }, { status: 404 });
  }
  try {
    await admin.saveSolution(parsed.data as Solution);
  } catch (e) {
    const r = readOnly(e);
    if (r) return r;
    throw e;
  }
  revalidateTag("content", { expire: 0 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await getAdmin())) return Response.json({ error: "forbidden" }, { status: 403 });
  const { problemId, solutionId } = await ctx.params;
  try {
    await (await contentAdmin()).deleteSolution(problemId, solutionId);
  } catch (e) {
    const r = readOnly(e);
    if (r) return r;
    throw e;
  }
  revalidateTag("content", { expire: 0 });
  return Response.json({ ok: true });
}
