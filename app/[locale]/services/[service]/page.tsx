import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import PackageServiceClient from "@/components/package-service-client";
import ProfileSignIn from "@/components/profile-signin";
import { authOptions } from "@/lib/auth";
import type { PackageBuilderService } from "@/lib/package-builder-state";

const serviceKeys: PackageBuilderService[] = [
  "hotel",
  "flight",
  "transfer",
  "excursion",
  "insurance",
];

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; service: string }>;
};

export default async function ServicePage({ params }: PageProps) {
  const { service } = await params;
  const serviceKey = service.toLowerCase() as PackageBuilderService;

  if (!serviceKeys.includes(serviceKey)) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <main className="container service-builder">
        <ProfileSignIn />
      </main>
    );
  }

  return <PackageServiceClient serviceKey={serviceKey} />;
}
