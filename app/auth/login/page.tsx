"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { login } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { accessToken, setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="relative grid min-h-screen place-content-center px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(2,6,23,0.88),rgba(15,23,42,0.9))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(242,124,0,0.3),transparent_40%)]" />

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="panel relative z-10 w-full max-w-md rounded-2xl border-white/15 bg-white/8 p-7 backdrop-blur-xl"
      >
        <div className="mb-7 text-center">
          <span className="mx-auto mb-3 grid size-14 place-content-center rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30">
            <Shield size={26} />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">CMS Login</h1>
          <p className="mt-1 text-sm text-slate-300">
            Masuk sebagai admin atau superadmin
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-9 text-slate-400" size={16} />
              <Input
                label="Email atau Phone"
                labelClassName="text-slate-200"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.test"
                autoComplete="username"
                className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-slate-400"
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-9 text-slate-400" size={16} />
              <Input
                label="Password"
                labelClassName="text-slate-200"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="********"
                autoComplete="current-password"
                className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-300/30 bg-red-500/15 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-300">
          Gunakan akun dari seed backend untuk development lokal.
        </p>
      </motion.section>
    </div>
  );
}
