import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-md border border-dashed bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button asChild className="mt-5">
          <a href={action.href}>{action.label}</a>
        </Button>
      ) : null}
    </div>
  );
}
