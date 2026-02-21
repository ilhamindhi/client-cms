import { TicketPercent } from "lucide-react";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

export default function MembershipCouponsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership Coupons</CardTitle>
          <CardDescription>
            Halaman ini disiapkan untuk manajemen kupon diskon membership premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<TicketPercent size={28} />}
            title="Belum diaktifkan"
            description="Struktur UI sudah siap. Integrasi CRUD coupon membership bisa ditambahkan sesuai endpoint berikutnya."
          />
        </CardContent>
      </Card>
    </div>
  );
}
