"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User as UserIcon } from "lucide-react";
import { supabase } from "@/app/supabaseClient";
import { registerUserProfile } from "@/lib/register-user-profile";

const PrimaryLocationField = dynamic(
  () =>
    import("@/components/auth/PrimaryLocationField").then((mod) => ({
      default: mod.PrimaryLocationField,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-xs text-muted-foreground">Loading location search…</p>
    ),
  },
);

function safeNextPath(next) {
  if (!next || typeof next !== "string") return "/";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  if (trimmed.includes("\\")) return "/";
  return trimmed;
}

const USER_TYPES = [
  {
    id: "member",
    label: "Member",
    description: "Book workshops and dance with the tribe.",
  },
  {
    id: "instructor",
    label: "Instructor",
    description: "Host workshops and grow your following.",
  },
];

const BIO_MAX_LENGTH = 280;

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState("member");
  const [bio, setBio] = useState("");
  const [instructorLocation, setInstructorLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFormError("");
    setFormMessage("");
    setInstructorLocation(null);
  };

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
        router.push(safeNextPath(searchParams.get("next")));
        router.refresh();
        return;
      }

      const trimmedName = fullName.trim();
      if (!trimmedName) {
        throw new Error("Please tell us your name so others know who you are.");
      }
      if (!USER_TYPES.some((t) => t.id === userType)) {
        throw new Error("Please choose whether you're signing up as a Member or an Instructor.");
      }
      const trimmedBio = bio.trim();
      if (trimmedBio.length > BIO_MAX_LENGTH) {
        throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
      }

      if (userType === "instructor") {
        if (!instructorLocation) {
          throw new Error(
            "Please choose your primary location of operation from the suggestions (with city and country)."
          );
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: trimmedName,
            user_type: userType,
            // Keep both keys around — handle_new_user reads `bio`, while other Supabase
            // integrations sometimes surface `name`/`description`.
            name: trimmedName,
            bio: trimmedBio || null,
          },
        },
      });

      if (error) throw error;

      if (data?.session) {
        const token = data.session.access_token;
        const bioPayload = trimmedBio || null;
        if (userType === "instructor") {
          await registerUserProfile(token, {
            full_name: trimmedName,
            user_type: "instructor",
            bio: bioPayload,
            primary_location: instructorLocation.primary_location,
            city: instructorLocation.city,
            country: instructorLocation.country,
            address_line: instructorLocation.address_line,
            state: instructorLocation.state,
          });
        } else {
          await registerUserProfile(token, {
            full_name: trimmedName,
            user_type: "member",
            bio: bioPayload,
          });
        }
        router.push(safeNextPath(searchParams.get("next")));
        router.refresh();
        return;
      }

      if (userType === "instructor") {
        setFormMessage(
          "Signup successful. Please check your email to confirm your account. After you sign in, set your primary teaching location from your profile (required for instructors) — it could not be saved until your email is confirmed."
        );
      } else {
        setFormMessage("Signup successful. Please check your email to confirm.");
      }
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

  const isSignup = mode === "signup";
  const bioCharsRemaining = BIO_MAX_LENGTH - bio.length;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-10">
        <Image
          src="/Logo.png"
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
            onClick={() => switchMode("login")}
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
            onClick={() => switchMode("signup")}
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
            {isSignup ? "Join the movement" : "Welcome back"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isSignup
              ? "Tell us a little about yourself to get started"
              : "Enter your credentials to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Full name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={120}
                    className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">I am joining as</legend>
                <div
                  role="radiogroup"
                  aria-label="Account type"
                  className="grid grid-cols-2 gap-2"
                >
                  {USER_TYPES.map((type) => {
                    const isSelected = userType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setUserType(type.id);
                          if (type.id === "member") setInstructorLocation(null);
                        }}
                        className={`text-left rounded-xl border px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-input hover:border-foreground/30 text-foreground"
                        }`}
                      >
                        <div className="text-sm font-semibold">{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {type.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {userType === "instructor" ? (
                <PrimaryLocationField onChange={setInstructorLocation} disabled={isLoading} />
              ) : null}
            </>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "Create a password" : "Enter your password"}
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

          {isSignup && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="bio" className="text-sm font-medium text-foreground">
                  Short bio <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <span
                  className={`text-xs ${
                    bioCharsRemaining < 0 ? "text-red-500" : "text-muted-foreground"
                  }`}
                >
                  {bioCharsRemaining}
                </span>
              </div>
              <textarea
                id="bio"
                placeholder={
                  userType === "instructor"
                    ? "Tell members about your style, training, and vibe."
                    : "A line or two about you — your favorite dance style, what you're looking for…"
                }
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX_LENGTH}
                rows={3}
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
              />
            </div>
          )}

          {!isSignup && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {isSignup && (
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
                <span>{isSignup ? "Create Account" : "Sign In"}</span>
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
