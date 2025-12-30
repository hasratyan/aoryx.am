import { notFound } from "next/navigation";
import PackageServiceClient from "@/components/package-service-client";
import type { PackageBuilderService } from "@/lib/package-builder-state";

const serviceKeys: PackageBuilderService[] = [
  "hotel",
  "flight",
  "transfer",
  "excursion",
  "insurance",
];

type PageProps = {
  params: Promise<{ locale: string; service: string }>;
};

export default async function ServicePage({ params }: PageProps) {
  const { service } = await params;
  const serviceKey = service.toLowerCase() as PackageBuilderService;

  if (!serviceKeys.includes(serviceKey)) {
    notFound();
  }

  return <PackageServiceClient serviceKey={serviceKey} />;
}
