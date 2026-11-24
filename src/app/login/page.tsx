import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || null;
  return (
    <main className="min-h-screen bg-ground">
      <div className="stripe" aria-hidden="true" />
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 pt-16 pb-12">
        <div>
          <p className="text-sm font-semibold text-muted">PressBoard</p>
          <h1 className="text-4xl leading-tight font-extrabold">Sign in</h1>
        </div>
        <LoginForm demoPassword={demoPassword} />
      </div>
    </main>
  );
}
