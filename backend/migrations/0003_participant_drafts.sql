-- Resumable two-level participant intake for TEST. Existing participant tables stay compatible.
-- migrate:statement
CREATE TABLE IF NOT EXISTS participant_intakes (
    intake_id Utf8,
    public_number Utf8,
    answers Utf8,
    status Utf8,
    revision Uint64,
    created_at Utf8,
    updated_at Utf8,
    expires_at Utf8,
    participant_id Utf8,
    token_hash Utf8,
    PRIMARY KEY (intake_id)
);
