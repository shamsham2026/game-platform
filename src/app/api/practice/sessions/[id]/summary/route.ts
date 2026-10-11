import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionFeedback } from "@/lib/practice-service";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const studentId = jar.get("gp_student")?.value;
  if (!studentId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    const feedback = await getSessionFeedback(id, studentId);
    return NextResponse.json(feedback);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "無法產生總結" },
      { status: 400 },
    );
  }
}
