import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getLoginRecommendations } from "@/lib/recommend-service";

const bodySchema = z.object({
  classCode: z.string().min(1),
  studentNo: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "請輸入班別與學號" }, { status: 400 });
  }

  const classRoom = await prisma.classRoom.findUnique({
    where: { code: parsed.data.classCode.trim() },
  });
  if (!classRoom) {
    return NextResponse.json({ error: "找不到班別" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({
    where: {
      classId_studentNo: {
        classId: classRoom.id,
        studentNo: parsed.data.studentNo.trim(),
      },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "找不到學號" }, { status: 404 });
  }

  const payload = await getLoginRecommendations(student.id);

  // Lightweight cookie session for demo (replace with signed JWT in production)
  const res = NextResponse.json(payload);
  res.cookies.set("gp_student", student.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
