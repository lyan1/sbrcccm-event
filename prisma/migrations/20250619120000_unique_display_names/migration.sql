-- Case-insensitive unique display names (all members/families, including inactive).
CREATE UNIQUE INDEX "Family_displayName_lower_key" ON "Family" (LOWER("displayName"));
CREATE UNIQUE INDEX "MemberAccount_displayName_lower_key" ON "MemberAccount" (LOWER("displayName"));
