import { updatePlatformSettingAction, updateReviewPromptSettingAction } from "@/features/admin/server/actions";
import { REVIEW_PROMPT_SETTING_KEY, parseReviewPromptConfig } from "@/features/ai/server/prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const { data, error } = await createAdminClient().from("platform_settings").select("id, setting_key, setting_value").order("setting_key");
  if (error) throw error;
  const reviewPromptSetting = (data ?? []).find((setting) => setting.setting_key === REVIEW_PROMPT_SETTING_KEY);
  const reviewPromptConfig = parseReviewPromptConfig(reviewPromptSetting?.setting_value);
  const editableJsonSettings = (data ?? []).filter((setting) => setting.setting_key !== REVIEW_PROMPT_SETTING_KEY);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review generation prompt</CardTitle>
          <CardDescription>
            Admin style instructions for customer review options. Safety rules remain fixed server-side and cannot be
            overridden here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateReviewPromptSettingAction} className="space-y-4">
            <div>
              <Label htmlFor="review-prompt">Prompt</Label>
              <Textarea
                id="review-prompt"
                name="prompt"
                defaultValue={reviewPromptConfig.prompt}
                className="mt-2 min-h-48"
              />
            </div>
            <div className="max-w-40">
              <Label htmlFor="options-count">Review options</Label>
              <Input
                id="options-count"
                name="optionsCount"
                type="number"
                min={2}
                max={3}
                defaultValue={reviewPromptConfig.optionsCount}
                className="mt-2"
              />
            </div>
            <FormSubmitButton loadingLabel="Saving…">Save review prompt</FormSubmitButton>
          </form>
        </CardContent>
      </Card>

      {editableJsonSettings.map((setting) => (
        <Card key={setting.id}>
          <CardHeader>
            <CardTitle>{setting.setting_key}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updatePlatformSettingAction} className="space-y-3">
              <input type="hidden" name="key" value={setting.setting_key} />
              <Textarea name="value" defaultValue={JSON.stringify(setting.setting_value, null, 2)} className="font-mono" />
              <FormSubmitButton loadingLabel="Saving…">Save setting</FormSubmitButton>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
