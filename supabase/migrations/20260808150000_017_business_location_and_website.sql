ALTER TABLE business_profiles ADD COLUMN physical_address text;
ALTER TABLE business_profiles ADD COLUMN website text;

ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_location_or_website
  CHECK (
    (physical_address IS NOT NULL AND trim(physical_address) <> '')
    OR (website IS NOT NULL AND trim(website) <> '')
  );
