-- TEST only: runtime ajeiujenn2jakrrak0gf@as.
-- Pair with ydb.auditor scoped to malars-test-ydb, replacing ydb.viewer.
-- No schema, ACL, DELETE, migration-tracking or directory-table access.
GRANT SELECT ROW, UPDATE ROW ON
    `persons`,
    `organizations`,
    `customer_requests`,
    `consent_events`,
    `organization_registration`,
    `participants`,
    `participant_profiles`,
    `person_contact_methods`,
    `participant_competencies`,
    `participant_object_types`,
    `participant_regions`,
    `participant_documents`,
    `participant_consent_events`
TO `ajeiujenn2jakrrak0gf@as`;
