"use client";

import { useMemo, useState } from "react";

function splitLines(s: string) {
  return s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TestPage() {
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [varsRaw, setVarsRaw] = useState("");
  const [titleTpl, setTitleTpl] = useState("Rendez-vous avec {var}");
  const [descTpl, setDescTpl] = useState(
    "Bonjour,\nVoici votre variable: {var}",
  );
  const [startLocal, setStartLocal] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const recipients = useMemo(() => splitLines(recipientsRaw), [recipientsRaw]);
  const vars = useMemo(() => splitLines(varsRaw), [varsRaw]);
  const countOk = recipients.length > 0 && recipients.length === vars.length;

  const submit = async () => {
    setResult(null);

    if (!countOk) {
      setResult({
        error:
          "La liste de destinataires et la liste de variables doivent avoir la même longueur (et non vide).",
        recipients: recipients.length,
        variables: vars.length,
      });
      return;
    }
    if (!startLocal) {
      setResult({ error: "Choisis un jour/heure de début." });
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/calendar/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          variables: vars,
          titleTemplate: titleTpl,
          descriptionTemplate: descTpl,
          startLocal,
          durationMin,
        }),
      });

      const data = await r.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📅</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Création d'événements en masse
            </h1>
          </div>
          <p className="text-slate-600 text-sm ml-13">
            Créez automatiquement des événements personnalisés pour chaque
            destinataire. Utilisez{" "}
            <code className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-mono">
              {"{var}"}
            </code>{" "}
            pour insérer des variables dynamiques.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Destinataires
              </label>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  recipients.length > 0
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {recipients.length} destinataire
                {recipients.length > 1 ? "s" : ""}
              </span>
            </div>
            <textarea
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              rows={10}
              className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm transition-all"
              placeholder="exemple@email.com&#10;contact@entreprise.fr&#10;..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Un email par ligne • Format valide requis
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Variables
              </label>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  vars.length > 0
                    ? "bg-purple-50 text-purple-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {vars.length} variable{vars.length > 1 ? "s" : ""}
              </span>
            </div>
            <textarea
              value={varsRaw}
              onChange={(e) => setVarsRaw(e.target.value)}
              rows={10}
              className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm transition-all"
              placeholder="Alice Dupont&#10;Bob Martin&#10;..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Une valeur par ligne • Sera insérée via {"{var}"}
            </p>
          </div>
        </div>

        <div
          className={`mb-6 p-4 rounded-xl border-2 ${
            countOk
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{countOk ? "✓" : "⚠"}</span>
            <p
              className={`text-sm font-medium ${
                countOk ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {countOk
                ? `Parfait ! ${recipients.length} paires destinataire/variable détectées`
                : "Le nombre de destinataires doit correspondre au nombre de variables"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Template de l'événement
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Titre de l'événement
              </label>
              <input
                value={titleTpl}
                onChange={(e) => setTitleTpl(e.target.value)}
                className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Ex: Rendez-vous avec {var}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={descTpl}
                onChange={(e) => setDescTpl(e.target.value)}
                rows={4}
                className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                placeholder="Ex: Bonjour {var}, ce message est personnalisé pour vous..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Planification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date et heure de début
              </label>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-slate-500">
                🕐 Fuseau horaire : Europe/Paris
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Durée
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  min={5}
                  step={5}
                  className="text-black w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  min
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading || !countOk}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all transform ${
            loading || !countOk
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Création en cours...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🚀</span>
              Créer {recipients.length} événement
              {recipients.length > 1 ? "s" : ""} et inviter
            </span>
          )}
        </button>

        {result && (
          <div className="mt-6 bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Résultat de l'opération
              </h4>
              <span className="text-xs text-slate-400">JSON Response</span>
            </div>
            <pre className="p-6 text-sm text-green-400 font-mono overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
