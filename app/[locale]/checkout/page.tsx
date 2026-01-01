import { getServerSession } from "next-auth";
import PackageCheckoutClient from "@/components/package-checkout-client";
import ProfileSignIn from "@/components/profile-signin";
import { authOptions } from "@/lib/auth";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: PageProps) {
  await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return (
      <main className="container">
        <ProfileSignIn />
      </main>
    );
  }
  return <PackageCheckoutClient />;
}
