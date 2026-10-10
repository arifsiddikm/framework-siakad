import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** One sentence + one next step (403, 404, module inactive). */
export function StatusPage({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <EmptyState
        title={title}
        hint={hint}
        action={
          <Link to="/">
            <Button>Kembali ke Beranda</Button>
          </Link>
        }
      />
    </Card>
  );
}
