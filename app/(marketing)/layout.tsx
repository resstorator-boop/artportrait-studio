import LandingFooter from "@/components/layout/LandingFooter";
import LandingNav from "@/components/layout/LandingNav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <LandingNav />
      <div className="flex-1">{children}</div>
      <LandingFooter />
    </div>
  );
}
