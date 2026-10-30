import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import ResolverRelay from "./ResolverRelay";

export const dynamic = "force-dynamic";

export default async function MarketplaceResolverRelayPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/servmacso10?next=/servmacso10/marketplace-resolver");
  return <ResolverRelay />;
}
