import { AdminInstructorsPage } from "@/components/site/elements/admin-instructors-page";
import { fetchActiveCategories } from "@/lib/categories-catalog";

export default async function AdminInstructorsRoute() {
  let categories: Awaited<ReturnType<typeof fetchActiveCategories>> = [];
  try {
    categories = await fetchActiveCategories();
  } catch {
    categories = [];
  }

  return <AdminInstructorsPage categories={categories} />;
}
