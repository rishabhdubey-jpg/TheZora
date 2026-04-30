"use client";

import { useActionState } from "react";
import { signupStudio } from "@/app/actions/auth";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const initialState = {
  error: null as string | null,
};

export default function SignupPage() {
  const [state, action, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await signupStudio(formData);
    if (result?.error) {
      toast.error(result.error);
      return result;
    }
    return { error: null };
  }, initialState);

  return (
    <div className="w-full max-w-md p-8 bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      <div className="flex flex-col space-y-2 text-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Create a Studio</h1>
        <p className="text-sm text-neutral-400">
          Enter your details below to create your studio account
        </p>
      </div>

      <form action={action} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="name">
              Studio Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Acme Photography"
              required
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-neutral-600 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-neutral-600 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-white placeholder:text-neutral-600 transition-all"
            />
          </div>
        </div>

        {state?.error && (
          <div className="text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center space-x-2 bg-white text-black hover:bg-neutral-200 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}
