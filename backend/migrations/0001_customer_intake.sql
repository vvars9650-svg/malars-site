-- Versioned, manual migration. Use `python -m backend.migrate`; never run at app startup.
-- migrate:statement
CREATE TABLE IF NOT EXISTS schema_migrations (
    version Utf8,
    applied_at Utf8,
    PRIMARY KEY (version)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS persons (
    person_id Utf8,
    display_name Utf8,
    primary_contact Utf8,
    created_at Utf8,
    PRIMARY KEY (person_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS organizations (
    organization_id Utf8,
    name Utf8,
    created_at Utf8,
    PRIMARY KEY (organization_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS customer_requests (
    request_id Utf8,
    person_id Utf8,
    organization_id Utf8,
    region Utf8,
    city Utf8,
    description Utf8,
    desired_deadline Utf8,
    status Utf8,
    created_at Utf8,
    PRIMARY KEY (request_id)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS legal_documents (
    document_id Utf8,
    version Utf8,
    status Utf8,
    text_sha256 Utf8,
    effective_at Utf8,
    PRIMARY KEY (document_id, version)
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS consent_events (
    event_id Utf8,
    person_id Utf8,
    request_id Utf8,
    consent_type Utf8,
    consent_version Utf8,
    policy_version Utf8,
    form_version Utf8,
    consented Bool,
    source Utf8,
    created_at Utf8,
    PRIMARY KEY (event_id)
);
