"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Shield, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { login } from "@/lib/api/auth";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFeedbackToast({
    error,
    errorTitle: "Login failed",
  });

  useEffect(() => {
    if (accessToken) {
      router.replace("/");
    }
  }, [accessToken, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      setAuth({
        user: result.user,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        expiresInSec: result.expires_in,
      });

      const redirect =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      router.replace(redirect || "/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen min-h-[100dvh] place-content-center px-4 py-6 sm:px-5 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(2,6,23,0.88),rgba(15,23,42,0.9))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(218,61,32,0.3),transparent_40%)]" />

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="panel relative z-10 w-full max-w-md rounded-2xl p-5 backdrop-blur-xl sm:p-7"
      >
        <div className="mb-6 text-center sm:mb-7">
          <span className="mx-auto mb-3 grid size-12 place-content-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 sm:size-14">
            <Shield size={24} />
          </span>
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">CMS Login</h1>
          <p className="mt-1 text-sm text-slate-600">
            Masuk sebagai admin atau superadmin
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-9 text-slate-400" size={16} />
              <Input
                label="Email"
                labelClassName="text-slate-700"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.test"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="username"
                className="pl-9"
                required
              />
            </div>

            <div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    autoComplete="current-password"
                    className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white pl-9 pr-11 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>
          </div>

          {error ? (
            <Alert variant="error">
              {error}
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Masuk
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Gunakan akun dari seed backend untuk development lokal.
        </p>
      </motion.section>
    </div>
  );
}
