import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SubscriptionGate({ children, paid, message = "Choose a paid plan to unlock this workspace." }: { children: React.ReactNode; paid: boolean; message?: string }) { return paid ? <>{children}</> : <div className="rounded-2xl border bg-card p-8 text-center"><h2 className="text-xl font-semibold">Paid access required</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p><Button asChild className="mt-5"><Link href="/pricing">Compare paid plans</Link></Button></div>; }
