import { CardLayout } from "@/components/layout";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DepositPage() {
  return (
    <CardLayout title="Deposit">
      <form>
        <Label htmlFor="amount">Enter a number:</Label>
        <Input type="number" name="amount"/>
      </form>
    </CardLayout>
  );
}
