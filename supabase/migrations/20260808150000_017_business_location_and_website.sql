ALTER TABLE business_profiles ADD COLUMN physical_address text;
ALTER TABLE business_profiles ADD COLUMN website text;

-- NOT VALID: existing rows were created before these columns existed, so
-- every one of them currently has both fields NULL. Validating the check
-- against old data would reject the migration outright. NOT VALID skips
-- that check for rows that already exist, but still enforces the rule on
-- every INSERT and UPDATE from this point on -- which is what actually
-- matters, since new signups already collect one of the two in the form.
ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_location_or_website
  CHECK (
    (physical_address IS NOT NULL AND trim(physical_address) <> '')
    OR (website IS NOT NULL AND trim(website) <> '')
  ) NOT VALID;
