import { RepShell } from "@/components/RepShell";
import { requireRep } from "@/lib/dal";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const { org, name } = await requireRep();
  return (
    <RepShell org={org} name={name}>
      {children}
    </RepShell>
  );
}
