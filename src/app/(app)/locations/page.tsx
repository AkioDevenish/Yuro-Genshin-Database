import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listLocations } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TaxonomyManager } from "@/components/taxonomy-manager";

export const metadata = { title: "Locations" };

export default async function LocationsPage() {
  const user = await requirePermission("taxonomy.manage");

  return (
    <>
      <PageHeader
        eyebrow="Warehouse"
        title="Locations"
        description="Stores, offices and sites where the organisation's stock physically sits."
      />
      <TaxonomyManager
        kind="location"
        noun="Location"
        entries={listLocations()}
        canManage={can(user.role, "taxonomy.manage")}
      />
    </>
  );
}
