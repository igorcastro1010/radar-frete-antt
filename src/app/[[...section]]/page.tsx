import { notFound } from "next/navigation";
import { Radar } from "@/components/radar";
export function generateStaticParams() {
  return [
    { section: [] },
    { section: ["tabela"] },
    { section: ["historico"] },
    { section: ["simulador"] },
  ];
}
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const view = section?.[0] || "visao-geral";
  if (
    (section?.length || 0) > 1 ||
    !["visao-geral", "tabela", "historico", "simulador"].includes(view)
  )
    notFound();
  return <Radar view={view} />;
}
