import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#00285F] flex-col items-center justify-center px-12 relative overflow-hidden">
        {/* Decorative gradient circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#ED0007]/10 blur-2xl" />

        {/* Brand content */}
        <div className="relative z-10 text-center space-y-6">
          {/* Logo mark */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-[#ED0007] flex items-center justify-center shadow-2xl shadow-red-900/30">
            <span className="text-white font-extrabold text-3xl tracking-tight">EB</span>
          </div>

          <h1 className="text-white text-5xl font-extrabold tracking-tight leading-tight">
            Easy Bricolage
          </h1>

          <div className="w-16 h-1 mx-auto rounded-full bg-[#ED0007]" />

          <p className="text-blue-200 text-xl font-medium tracking-wide">
            Système de Gestion Commerciale
          </p>

          <p className="text-blue-300/70 text-sm max-w-xs mx-auto leading-relaxed">
            Gérez vos ventes, stocks et factures en toute simplicité avec notre plateforme professionnelle.
          </p>
        </div>
      </div>

      {/* ── Mobile Brand Strip (visible on small screens only) ── */}
      <div className="lg:hidden bg-[#00285F] px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#ED0007] flex items-center justify-center">
            <span className="text-white font-extrabold text-lg">EB</span>
          </div>
          <h1 className="text-white text-2xl font-extrabold tracking-tight">
            Easy Bricolage
          </h1>
        </div>
        <p className="text-blue-200 text-sm font-medium">
          Système de Gestion Commerciale
        </p>
      </div>

      {/* ── Right Sign-In Panel ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12 lg:py-0">
        <div className="w-full max-w-md">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none w-full bg-transparent",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
