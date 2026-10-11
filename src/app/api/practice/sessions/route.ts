import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { startPracticeSession } from "@/lib/practice-service";

const bodySchema = z.object({
  topicIds: z.array(z.string()).min(1),
  count: z.number().int().min(1).max(30).optional(),
  templateId: z.string().optional(),
});

export async function POST(req: Request) {
  const jar = await cookies();
  const studentId = jar.get("gp_student")?.value;
  if (!studentId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "請選擇課題" }, { status: 400 });
  }

  const session = await startPracticeSession({
    studentId,
    topicIds: parsed.data.topicIds,
    count: parsed.data.count,
    templateId: parsed.data.templateId,
  });

  if (session.items.length === 0) {
    return NextResponse.json(
      { error: "此課題尚無已審核練習題" },
      { status: 404 },
    );
  }

  return NextResponse.json(session);
}
