import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <AuthForm />
    </main>
  );
}
