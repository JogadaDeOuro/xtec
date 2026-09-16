REVOKE EXECUTE ON FUNCTION public.set_organization_id() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_stage_item_org() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_signature_org() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_plan_limit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_account_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_platform_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_organizations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.signup_create_organization(text, text, text) FROM anon;