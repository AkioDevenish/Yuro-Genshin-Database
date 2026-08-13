import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/roles";
import { listCategories } from "@/lib/queries";
import { PageHeader } from "@/components/ui";
import { TaxonomyManager } from "@/components/taxonomy-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requirePermission("taxonomy.manage");

  return (
    <>
      <PageHeader
        eyebrow="Warehouse"
        title="Categories"
        description="Group the catalogue so reporting and searching stay meaningful as it grows."
      />
      <TaxonomyManager
        kind="category"
        noun="Category"
        entries={await listCategories()}
        canManage={can(user.role, "taxonomy.manage")}
      />
    </>
  );
}
