import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReviewSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold">Google review page opened</h1>
      <p className="mt-3 text-muted-foreground">
        Paste your copied text into Google, select your rating and submit it directly on Google.
      </p>
      <Button asChild variant="outline" className="mx-auto mt-6">
        <Link href="/">Done</Link>
      </Button>
    </main>
  );
}
