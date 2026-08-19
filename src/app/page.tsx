import { Customizer } from "@/components/customizer";
import { customizationFromQuery } from "@/lib/state";

export default async function Home({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const initial = customizationFromQuery(query);
  const frame = [query.frame].flat()[0] ?? "side-0";

  return <Customizer initial={initial} initialFrame={frame} />;
}
