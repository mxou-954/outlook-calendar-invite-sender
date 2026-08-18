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

function isEmail(x: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x);
}

// Format attendu par Google quand on precise timeZone : "2025-03-15T10:00:00"
// (heure locale, sans decalage). On evite ainsi la double conversion.
function toLocalDateTime(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:00`
  );
}

const BACK_URL = process.env.BACK_URL ?? "http://localhost:3001";

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

    const invalidEmails = recipients.filter((e) => !isEmail(e));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: "Adresses email invalides", invalidEmails },
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
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "startLocal invalide" },
        { status: 400 },
      );
    }
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

    const payload = {
      tokens: { access_token, refresh_token },
      titleTemplate,
      descriptionTemplate,
      startISO: toLocalDateTime(startDate),
      endISO: toLocalDateTime(endDate),
      recipients,
      variables,
    };

    const r = await fetch(`${BACK_URL}/calendar/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
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
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      return NextResponse.json(
        { error: `Le backend (${BACK_URL}) n'a pas répondu à temps` },
        { status: 504 },
      );
    }
    if (e?.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        { error: `Backend injoignable sur ${BACK_URL}. Est-il démarré ?` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}