import PackageCheckoutClient from "@/components/package-checkout-client";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function CheckoutPage({ params }: PageProps) {
  await params;
  return <PackageCheckoutClient />;
}
