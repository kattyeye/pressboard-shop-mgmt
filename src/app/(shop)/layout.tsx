import { ShopShell } from "@/components/ShopShell";
import { requireShop } from "@/lib/dal";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { org, name, membership } = await requireShop();
  return (
    <ShopShell org={org} name={name} role={membership.role}>
      {children}
    </ShopShell>
  );
}
