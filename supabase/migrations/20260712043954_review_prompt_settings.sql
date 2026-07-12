insert into public.platform_settings (setting_key, setting_value)
values (
  'review_generation_prompt',
  jsonb_build_object(
    'prompt',
    'Write natural, clear review options that sound like a real customer calmly describing their own experience. Keep the wording human and specific to the customer input, but do not add facts, names, services, outcomes, compliments, complaints or recommendations that the customer did not provide. Use the business name and category only for context and terminology.',
    'optionsCount',
    3
  )
)
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    updated_at = now();
