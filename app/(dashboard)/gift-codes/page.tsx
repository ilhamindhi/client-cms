import { Gift } from "lucide-react";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

export default function GiftCodesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gift Codes</CardTitle>
          <CardDescription>
            Monitoring flow gift code redeem points random dan gift membership premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<Gift size={28} />}
            title="Belum diaktifkan"
            description="Halaman ini siap dilanjutkan untuk CRUD gift code campaign dan analytics redeem."
          />
        </CardContent>
      </Card>
    </div>
  );
}
