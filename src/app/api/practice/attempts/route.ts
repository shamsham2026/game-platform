import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { submitAttempt } from "@/lib/practice-service";

const bodySchema = z.object({
  sessionItemId: z.string(),
  response: z.any(),
  timeMs: z.number().int().optional(),
});

export async function POST(req: Request) {
  const jar = await cookies();
  const studentId = jar.get("gp_student")?.value;
  if (!studentId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "無效作答" }, { status: 400 });
  }

  const item = await prisma.sessionItem.findUnique({
    where: { id: parsed.data.sessionItemId },
    include: { session: true },
  });
  if (!item || item.session.studentId !== studentId) {
    return NextResponse.json({ error: "無權作答" }, { status: 403 });
  }

  try {
    const result = await submitAttempt({
      sessionItemId: parsed.data.sessionItemId,
      response: parsed.data.response ?? null,
      timeMs: parsed.data.timeMs,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "作答失敗" },
      { status: 400 },
    );
  }
}
