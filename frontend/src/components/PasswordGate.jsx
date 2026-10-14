import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordGate({ onSignIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!password) return;
    setIsBusy(true);
    setError("");
    const message = await onSignIn(password);
    setIsBusy(false);
    if (message) {
      setError(message);
      setPassword("");
    }
  };

  return (
    <section className="relative z-10 flex min-h-[60vh] flex-col justify-center py-16">
      <div className="mx-auto w-full max-w-sm">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-card">
          <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="font-display text-3xl font-light tracking-tight">This Sift is private</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the password to continue.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label htmlFor="access-password" className="sr-only">Password</label>
          <Input
            id="access-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "access-error" : undefined}
            className="h-12 text-base"
          />
          {error && (
            <p id="access-error" role="alert" className="text-sm text-status-abandoned">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isBusy || !password} className="h-11 w-full">
            {isBusy ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </section>
  );
}
