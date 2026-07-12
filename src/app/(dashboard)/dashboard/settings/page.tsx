import { requireActiveOwner } from "@/lib/auth/roles";
import { deleteOwnAccountAction, updatePasswordAction, updateProfileAction } from "@/features/auth/server/account-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  const { user, profile } = await requireActiveOwner();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-3">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={profile.full_name ?? ""} />
            <p className="text-sm text-muted-foreground">Email: {user.email}</p>
            <p className="text-sm text-muted-foreground">Status: {profile.account_status}</p>
            <Button>Save profile</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePasswordAction} className="space-y-3">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" minLength={8} />
            <Button>Update password</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={deleteOwnAccountAction} className="flex flex-col gap-3 sm:flex-row">
            <Input name="confirmation" placeholder="DELETE MY ACCOUNT" />
            <Button variant="destructive">Delete account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
