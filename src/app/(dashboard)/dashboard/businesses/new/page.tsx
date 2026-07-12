import { BusinessForm } from "@/features/businesses/components/business-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewBusinessPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business onboarding</CardTitle>
        <CardDescription>Google review URLs are validated and normalized before saving.</CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessForm />
      </CardContent>
    </Card>
  );
}
