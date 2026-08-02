"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, requireAdmin } from "@/lib/auth/roles";

const inquirySchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  locationsNeeded: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(2000),
});

export type SubmitCustomPlanInquiryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitCustomPlanInquiryAction(
  formData: FormData,
): Promise<SubmitCustomPlanInquiryResult> {
  const parsed = inquirySchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    companyName: formData.get("companyName") || "",
    locationsNeeded: formData.get("locationsNeeded") || "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid form data.";
    return { ok: false, error: first };
  }

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const { error } = await admin.from("custom_plan_inquiries").insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone || null,
    company_name: parsed.data.companyName || null,
    locations_needed: parsed.data.locationsNeeded || null,
    message: parsed.data.message,
    user_id: user?.id ?? null,
    status: "new",
  });

  if (error) {
    console.error("[custom-plan-inquiry]", error);
    return { ok: false, error: "Could not send your request. Please try again." };
  }

  revalidatePath("/admin/custom-plan-inquiries");
  return { ok: true };
}

export async function updateCustomPlanInquiryStatusAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum(["new", "contacted", "closed"]),
      adminNotes: z.string().max(2000).optional(),
    })
    .parse({
      id: formData.get("id"),
      status: formData.get("status"),
      adminNotes: formData.get("adminNotes") || undefined,
    });

  const admin = createAdminClient();
  const { error } = await admin
    .from("custom_plan_inquiries")
    .update({
      status: parsed.status,
      admin_notes: parsed.adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.id);

  if (error) throw error;
  revalidatePath("/admin/custom-plan-inquiries");
}
