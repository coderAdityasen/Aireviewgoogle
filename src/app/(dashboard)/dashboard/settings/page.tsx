import Link from "next/link";
import { requireActiveOwner } from "@/lib/auth/roles";
import { getOwnerEntitlements } from "@/lib/billing/entitlements";
import { deleteOwnAccountAction, updatePasswordAction, updateProfileAction } from "@/features/auth/server/account-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const { user, profile } = await requireActiveOwner();
  const entitlements = await getOwnerEntitlements(user.id);
  const displayName = profile.full_name?.trim() || user.email?.split("@")[0] || "Account";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "RF";

  return <div className="space-y-5 pb-8">
    <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">Account</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.06em]">My profile</h2><p className="mt-2 text-sm font-medium text-muted-foreground">Manage your account details and workspace access.</p></div>
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card><CardContent className="p-6 text-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#4d3df2] text-3xl font-extrabold text-white ring-4 ring-[#eef0ff]">{initials}</div><h3 className="mt-5 text-2xl font-extrabold tracking-[-0.05em]">{displayName}</h3><p className="mt-1 truncate text-sm font-medium text-muted-foreground">{user.email}</p><Badge className="mt-4">{entitlements.plan.name} plan</Badge><div className="mt-6 border-t border-border/70 pt-5 text-left"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="font-extrabold text-emerald-600">Active</span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Member since</span><span className="font-extrabold">{new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div></div></CardContent></Card>
        <Card><CardHeader><CardTitle>Subscription & plan</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Current plan</span><span className="font-extrabold">{entitlements.plan.name}</span></div><Usage label="Locations" value={entitlements.usage.businesses} limit={entitlements.plan.businesses} /><Usage label="AI drafts" value={entitlements.usage.aiGenerations} limit={entitlements.plan.aiGenerations} /><Button asChild variant="outline" className="mt-5 w-full"><Link href="/dashboard/billing">Manage billing</Link></Button></CardContent></Card>
      </div>
      <div className="space-y-5">
        <Card><CardHeader><CardTitle>Personal details</CardTitle><p className="text-sm font-medium text-muted-foreground">Your name appears in workspace account controls.</p></CardHeader><CardContent><form action={updateProfileAction} className="space-y-4"><div><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} className="mt-2" /></div><div><Label htmlFor="email">Email address</Label><Input id="email" value={user.email ?? ""} readOnly disabled className="mt-2 bg-muted" /></div><FormSubmitButton loadingLabel="Saving...">Save details</FormSubmitButton></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Password</CardTitle><p className="text-sm font-medium text-muted-foreground">Use a strong password you do not reuse elsewhere.</p></CardHeader><CardContent><form action={updatePasswordAction} className="space-y-4"><div><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={8} className="mt-2" /></div><FormSubmitButton loadingLabel="Updating...">Update password</FormSubmitButton></form></CardContent></Card>
      </div>
    </div>
    <Card className="border-destructive/20"><CardHeader><CardTitle className="text-destructive">Delete account</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm font-medium text-muted-foreground">This permanently removes your account and owned workspace data. This action cannot be undone.</p><form action={deleteOwnAccountAction} className="flex flex-col gap-3 sm:flex-row"><Input name="confirmation" placeholder="DELETE MY ACCOUNT" className="sm:max-w-xs" /><FormSubmitButton variant="destructive" loadingLabel="Deleting...">Delete account</FormSubmitButton></form></CardContent></Card>
  </div>;
}

function Usage({ label, value, limit }: { label: string; value: number; limit: number }) {
  const width = Math.min(100, Math.round((value / limit) * 100));
  return <div className="mt-4"><div className="flex justify-between gap-2 text-xs font-bold"><span>{label}</span><span className="text-muted-foreground">{value}/{limit}</span></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div>;
}
