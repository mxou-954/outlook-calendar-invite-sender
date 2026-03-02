import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/authOptions";

function requireString(x: any, name: string) {
  if (typeof x !== "string" || !x.trim())
    throw new Error(`Champ invalide: ${name}`);
  return x.trim();
}

function requireStringArray(x: any, name: string) {
  if (!Array.isArray(x)) throw new Error(`Champ invalide: ${name}`);
  const arr = x.map((v) => String(v).trim()).filter(Boolean);
  if (arr.length === 0) throw new Error(`Liste vide: ${name}`);
  return arr;
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    const access_token = session?.access_token;
    const refresh_token = session?.refresh_token;

    if (!access_token && !refresh_token) {
      return NextResponse.json(
        { error: "Pas connecté. Va sur /api/auth/signin" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const recipients = requireStringArray(body.recipients, "recipients");
    const variables = requireStringArray(body.variables, "variables");
    if (recipients.length !== variables.length) {
      return NextResponse.json(
        {
          error: "recipients et variables doivent avoir la même longueur",
          recipients: recipients.length,
          variables: variables.length,
        },
        { status: 400 },
      );
    }

    const titleTemplate = requireString(body.titleTemplate, "titleTemplate");
    const descriptionTemplate = requireString(
      body.descriptionTemplate,
      "descriptionTemplate",
    );
    const startLocal = requireString(body.startLocal, "startLocal");
    const durationMin = Number(body.durationMin ?? 30);
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      return NextResponse.json(
        { error: "durationMin invalide" },
        { status: 400 },
      );
    }

    const startDate = new Date(startLocal);
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

    const payload = {
      tokens: { access_token, refresh_token },
      titleTemplate,
      descriptionTemplate,
      startISO: startDate.toISOString(),
      endISO: endDate.toISOString(),
      recipients,
      variables,
    };

    const r = await fetch("http://localhost:3001/calendar/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let data: any;
    console.log("Nest status:", r.status);
    console.log("Nest body:", text);
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json({ status: r.status, data }, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}