import { revalidateTag } from "next/cache";
import { ProblemSchema } from "@/lib/authoring/schemas";
import { contentAdmin, ContentReadOnlyError } from "@/lib/data/store";
import { getAdmin } from "@/lib/session";
import type { Problem } from "@/lib/types";

/** Create or update a problem (admins only). */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/problems/[problemId]">) {
  if (!(await getAdmin())) return Response.json({ error: "forbidden" }, { status: 403 });
  const { problemId } = await ctx.params;

  const parsed = ProblemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.id !== problemId) return Response.json({ error: "id_mismatch" }, { status: 400 });

  try {
    await (await contentAdmin()).saveProblem(parsed.data as Problem);
  } catch (e) {
    if (e instanceof ContentReadOnlyError) {
      return Response.json({ error: "read_only", message: e.message }, { status: 409 });
    }
    throw e;
  }
  revalidateTag("content", { expire: 0 });
  return Response.json({ ok: true });
}
