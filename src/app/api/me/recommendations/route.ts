import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getLoginRecommendations } from "@/lib/recommend-service";

export async function GET() {
  const jar = await cookies();
  const studentId = jar.get("gp_student")?.value;
  if (!studentId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  try {
    const payload = await getLoginRecommendations(studentId);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "學生不存在" }, { status: 404 });
  }
}
