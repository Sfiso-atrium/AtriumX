-- Business accounts are auto-approved. Listing moderation remains separate.

UPDATE business_profiles
SET status = 'approved'
WHERE status = 'pending';

ALTER TABLE business_profiles
  ALTER COLUMN status SET DEFAULT 'approved';

CREATE OR REPLACE FUNCTION enforce_business_auto_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.status := 'approved';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_profiles_auto_approve ON business_profiles;
CREATE TRIGGER business_profiles_auto_approve
BEFORE INSERT OR UPDATE OF status ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_business_auto_approval();

DROP FUNCTION IF EXISTS approve_business(uuid);
DROP FUNCTION IF EXISTS reject_business(uuid);
