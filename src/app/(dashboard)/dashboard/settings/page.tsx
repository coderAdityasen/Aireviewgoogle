import { requireActiveOwner } from "@/lib/auth/roles";
import { deleteOwnAccountAction, updatePasswordAction, updateProfileAction } from "@/features/auth/server/account-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
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
            <FormSubmitButton loadingLabel="Saving…">Save profile</FormSubmitButton>
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
            <FormSubmitButton loadingLabel="Updating…">Update password</FormSubmitButton>
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
            <FormSubmitButton variant="destructive" loadingLabel="Deleting…">Delete account</FormSubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
