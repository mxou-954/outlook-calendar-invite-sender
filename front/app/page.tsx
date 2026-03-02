"use client";

export default function Home() {
  const handleRedirection = () => {
    window.location.href = "http://localhost:3000/api/auth/signin";
  };

  const handleEvenement = () => {
    window.location.href = "http://localhost:3000/dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <span className="text-2xl font-bold text-slate-900">EventMaster</span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            Gestion d'événements
          </h2>

          <div className="space-y-3">
            <button
              onClick={handleRedirection}
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              S'identifier
            </button>

            <button
              onClick={handleEvenement}
              className="w-full px-6 py-4 bg-white text-slate-700 rounded-xl font-semibold border-2 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition-all"
            >
              Envoyer des événements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
