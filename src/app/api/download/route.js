import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { auth } from "@/auth";
import { incrementRouteUsage } from "@/lib/db";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  incrementRouteUsage("/api/download").catch(() => {});

  const { files, name } = await request.json();
  if (!files?.length) {
    return NextResponse.json({ error: "No files to download" }, { status: 400 });
  }

  const zip = new AdmZip();
  for (const f of files) {
    const buf =
      f.encoding === "base64" ? Buffer.from(f.content || "", "base64") : Buffer.from(f.content ?? "", "utf8");
    zip.addFile(f.path.replace(/^\/+/, ""), buf);
  }

  const buffer = zip.toBuffer();
  const safeName = (name || "t3rri-hub-project").replace(/[^\w.-]/g, "_");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
