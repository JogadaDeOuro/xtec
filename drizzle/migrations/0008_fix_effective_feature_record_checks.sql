CREATE OR REPLACE FUNCTION private.effective_feature(_org uuid, _code text)
RETURNS TABLE (enabled boolean, limit_value integer, unlimited boolean, period text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pf RECORD;
  ov RECORD;
  has_plan boolean := false;
  has_override boolean := false;
BEGIN
  SELECT f.enabled, f.limit_value, f.period INTO pf
  FROM public.subscriptions s
  JOIN public.plan_features f ON f.plan_id = s.plan_id AND f.feature_code = _code
  WHERE s.organization_id = _org;
  has_plan := FOUND;

  IF NOT has_plan THEN
    SELECT f.enabled, f.limit_value, f.period INTO pf
    FROM public.plans p
    JOIN public.plan_features f ON f.plan_id = p.id AND f.feature_code = _code
    WHERE p.code = 'free';
    has_plan := FOUND;
  END IF;

  IF has_plan THEN
    enabled := COALESCE(pf.enabled, false);
    limit_value := pf.limit_value;
    period := COALESCE(pf.period, 'total');
    unlimited := pf.limit_value IS NULL;
  ELSE
    enabled := false;
    limit_value := 0;
    period := 'total';
    unlimited := false;
  END IF;

  SELECT o.enabled AS ov_enabled, o.limit_value AS ov_limit, o.unlimited AS ov_unlimited INTO ov
  FROM public.organization_feature_overrides o
  WHERE o.organization_id = _org AND o.feature_code = _code
    AND o.starts_at <= now() AND (o.expires_at IS NULL OR o.expires_at > now())
  ORDER BY o.created_at DESC LIMIT 1;
  has_override := FOUND;

  IF has_override THEN
    IF ov.ov_enabled IS NOT NULL THEN enabled := ov.ov_enabled; END IF;
    IF COALESCE(ov.ov_unlimited, false) THEN
      unlimited := true; limit_value := NULL;
    ELSIF ov.ov_limit IS NOT NULL THEN
      unlimited := false; limit_value := ov.ov_limit;
    END IF;
  END IF;

  RETURN NEXT;
END $$;