"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/app/supabaseClient";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError("");
    setFormMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setFormMessage("Signup successful. Please check your email to confirm.");
    } catch (error) {
      const message = error?.message || "Something went wrong. Please try again.";
      if (message.includes("Invalid path specified in request URL")) {
        setFormError(
          "Auth is misconfigured in production. Check NEXT_PUBLIC_SUPABASE_URL in Vercel and make sure it is your Supabase project URL (https://<project-ref>.supabase.co)."
        );
      } else {
        setFormError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-10">
        <Image
          src="/Logo.jpg"
          alt="Thayya - Move. Rise. Shine."
          width={220}
          height={140}
          priority
          className="object-contain"
        />
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-muted rounded-full p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              mode === "signup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-medium text-foreground">
            {mode === "login" ? "Welcome back" : "Join the movement"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login"
              ? "Enter your credentials to continue"
              : "Start your dance fitness journey today"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-11 pr-12 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{" "}
              <button type="button" className="text-foreground hover:underline">
                Terms of Service
              </button>{" "}
              and{" "}
              <button type="button" className="text-foreground hover:underline">
                Privacy Policy
              </button>
            </p>
          )}

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          {formMessage && <p className="text-sm text-emerald-600">{formMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Dance your way to fitness with Thayya
      </p>
    </div>
  );
}
