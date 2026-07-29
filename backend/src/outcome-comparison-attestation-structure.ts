type StructureReadinessClient = {
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
};

export const checkOutcomeComparisonAttestationStructureReadiness = async (
  client: StructureReadinessClient
): Promise<boolean> => {
  try {
    const rows = await client.$queryRawUnsafe<Array<{ ok: boolean }>>(`
      /* outcome_comparison_attestation_structure */
      WITH expected_functions(
        function_name, identity_arguments, return_type, security_definer,
        volatility, function_language, function_binary, function_parallel,
        function_is_strict, expected_search_path, allowed_body_hashes,
        runtime_execute
      ) AS (
        VALUES
          ('outcome_comparison_attestation_frame', 'value bytea', 'bytea', false, 'i',
           'sql', NULL, 's', true, ARRAY['search_path=pg_catalog']::TEXT[],
           ARRAY['96e3ff814aa07903822421a1d9d1cb9228a72c7f8736e7519da94b105115df94']::TEXT[], false),
          ('outcome_comparison_creation_attestation_message',
           'release_row outcome_comparison_privacy_releases', 'bytea', false, 'i',
           'sql', NULL, 's', true, ARRAY['search_path=pg_catalog, public']::TEXT[],
           ARRAY['f3494b590f88891f50eaeeb90fe34cf9d40f00be87a0cb96885412fe3e747517',
                 'dd14bd956cb8e51d23f2e561d63ee6baa71a46fc32b831715c188884abc5c553']::TEXT[], false),
          ('stamp_outcome_comparison_creation_attestation', '', 'trigger', true, 'v',
           'plpgsql', NULL, 'u', false, ARRAY['search_path=pg_catalog, public']::TEXT[],
           ARRAY['f24650f24cc8a892fec586b7b416f807cbf7a985c78f8219954e5c5adb228f76',
                 'd2f1dd912f45454d24826e9b1feeecd0d5f08e3991bfcafd710cb26b9780261b']::TEXT[], false),
          ('verify_outcome_comparison_creation_attestation', 'release_id uuid', 'boolean', true, 'v',
           'plpgsql', NULL, 'u', false, ARRAY['search_path=pg_catalog, public']::TEXT[],
           ARRAY['3265c4021509a8773ab187e32ee9c3f9861581bee47dc742cb1f9dbfc59509d9',
                 'eced2120134134c61c098bd3a5794b6313eec2f6c3823707f51a450622141eed']::TEXT[], true),
          ('outcome_comparison_attestation_readiness',
           'configured_active_key_id text, configured_key_ids text[], configured_secrets text[]',
           'TABLE(ok boolean, diagnostics text[])', true, 'v',
           'plpgsql', NULL, 'u', false, ARRAY['search_path=pg_catalog, public']::TEXT[],
           ARRAY['5becef391b62973f6e2c1a7f1e3865393f029c72b094cc1a2356dcea486c547f',
                 '0be99f008fbeba346c3f3eea056fefb590ffbcfb5639b9ea7dd50996f736ae6b']::TEXT[], true),
          ('reject_c1_runtime_lock_only_mutation', '', 'trigger', false, 'v',
           'plpgsql', NULL, 'u', false, ARRAY['search_path=pg_catalog']::TEXT[],
           ARRAY['80df9f95714a47444d65fc21a0b56e5790461142b6c528c4268e68d9558239d3']::TEXT[], false),
          ('lock_outcome_evidence_family_mutation', '', 'trigger', false, 'v',
           'plpgsql', NULL, 'u', false, ARRAY['search_path=pg_catalog, public']::TEXT[],
           ARRAY['bd68316cdace1bcdd4677c8c1743c06147906336166f067f6ad9cdd6251d5e8d']::TEXT[], false),
          ('outcome_evidence_family_lock_key',
           'org_id_value text, workflow_id_value text, jbtd_id_value text, persona_id_value text',
           'text', false, 'i', 'sql', NULL, 's', false,
           ARRAY['search_path=pg_catalog']::TEXT[],
           ARRAY['e7f6252ddde2c4d762fc15e5c09b21150f6babeaffc69bdd3c7b4f7d0f4795a1']::TEXT[], false)
      ),
      actual_functions AS (
        SELECT
          proc.proname AS function_name,
          pg_catalog.pg_get_function_identity_arguments(proc.oid) AS identity_arguments,
          pg_catalog.pg_get_function_result(proc.oid) AS return_type,
          proc.prosecdef AS security_definer,
          proc.provolatile AS volatility,
          language.lanname AS function_language,
          proc.probin AS function_binary,
          proc.proparallel AS function_parallel,
          proc.proisstrict AS function_is_strict,
          proc.proowner,
          proc.proconfig,
          proc.proacl,
          pg_catalog.encode(
            public.digest(
              pg_catalog.convert_to(
                pg_catalog.regexp_replace(pg_catalog.btrim(proc.prosrc), '\\s+', ' ', 'g'),
                'UTF8'
              ),
              'sha256'
            ),
            'hex'
          ) AS body_hash,
          proc.oid
        FROM pg_catalog.pg_proc AS proc
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = proc.pronamespace
        JOIN pg_catalog.pg_language AS language
          ON language.oid = proc.prolang
        WHERE namespace.nspname = 'public'
              AND proc.proname IN (SELECT function_name FROM expected_functions)
      ),
      expected_crypto(function_oid, source_symbol) AS (
        VALUES
          ('public.digest(bytea,text)'::regprocedure, 'pg_digest'),
          ('public.hmac(bytea,bytea,text)'::regprocedure, 'pg_hmac')
      ),
      expected_tables(table_name, expected_rls) AS (
        VALUES
          ('outcome_comparison_attestation_keys', true),
          ('outcome_comparison_attestation_key_activations', true),
          ('outcome_comparison_attestation_key_revocations', true),
          ('outcome_comparison_privacy_releases', true),
          ('cohort_producer_authorities', true),
          ('cohort_producer_authority_revocations', true),
          ('aggregate_privacy_reservations', true),
          ('cohort_proof_journal', true),
          ('outcome_evidence', true),
          ('ai_value_objects', true),
          ('aggregate_privacy_release_journal', false)
      ),
      provisioner_forbidden_table AS (
        SELECT table_row.oid
        FROM pg_catalog.pg_class AS table_row
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = table_row.relnamespace
        WHERE namespace.nspname = 'public'
          AND table_row.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND table_row.relname NOT IN (
            'outcome_comparison_attestation_keys',
            'outcome_comparison_attestation_key_activations',
            'outcome_comparison_attestation_key_revocations'
          )
      ),
      expected_activation_sequence AS (
        SELECT (
          pg_catalog.pg_get_serial_sequence(
            'public.outcome_comparison_attestation_key_activations',
            'activation_epoch'
          )
        )::regclass AS oid
      ),
      provisioner_forbidden_sequence AS (
        SELECT sequence_row.oid
        FROM pg_catalog.pg_class AS sequence_row
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = sequence_row.relnamespace
        WHERE namespace.nspname = 'public'
          AND sequence_row.relkind = 'S'
          AND sequence_row.oid <> (
            SELECT oid FROM expected_activation_sequence
          )
      ),
      expected_columns(table_name, column_name, type_name) AS (
        VALUES
          ('outcome_comparison_attestation_keys', 'key_id', 'text'),
          ('outcome_comparison_attestation_keys', 'algorithm', 'text'),
          ('outcome_comparison_attestation_keys', 'secret_hash', 'text'),
          ('outcome_comparison_attestation_keys', 'provisioned_at', 'timestamp(3) with time zone'),
          ('outcome_comparison_attestation_key_activations', 'activation_epoch', 'bigint'),
          ('outcome_comparison_attestation_key_activations', 'key_id', 'text'),
          ('outcome_comparison_attestation_key_activations', 'activated_at', 'timestamp(3) with time zone'),
          ('outcome_comparison_attestation_key_revocations', 'key_id', 'text'),
          ('outcome_comparison_attestation_key_revocations', 'reason_code', 'text'),
          ('outcome_comparison_attestation_key_revocations', 'revoked_at', 'timestamp(3) with time zone'),
          ('outcome_comparison_privacy_releases', 'id', 'uuid'),
          ('outcome_comparison_privacy_releases', 'attestation_key_id', 'text'),
          ('outcome_comparison_privacy_releases', 'creation_attestation', 'text'),
          ('outcome_comparison_privacy_releases', 'created_at', 'timestamp(3) with time zone')
      ),
      expected_constraints(
        constraint_name, table_name, constraint_type, definition_hash
      ) AS (
        VALUES
          ('outcome_comparison_attestation_keys_pkey', 'outcome_comparison_attestation_keys', 'p', 'a458123ce2e8d32c8ea9ebe186065a10dbc2e412a4eb6848bcf4a1f373f2d3fc'),
          ('outcome_comparison_attestation_key_shape_check', 'outcome_comparison_attestation_keys', 'c', '7da74afe4f35d2ca4db90084a8742aab221148d4567a348788c243d6980ee779'),
          ('outcome_comparison_attestation_key_activations_pkey', 'outcome_comparison_attestation_key_activations', 'p', 'ebc9a5a9b5c65d904214bf935ec46f96f7dce3f2b07383de33a44d0d738c4dad'),
          ('outcome_comparison_attestation_activation_key_fkey', 'outcome_comparison_attestation_key_activations', 'f', 'b4d11f63d5ec12be98308b1408aac8a606838f66a6543203e2ddb92cb09a9a49'),
          ('outcome_comparison_attestation_key_revocations_pkey', 'outcome_comparison_attestation_key_revocations', 'p', 'a458123ce2e8d32c8ea9ebe186065a10dbc2e412a4eb6848bcf4a1f373f2d3fc'),
          ('outcome_comparison_attestation_revocation_reason_check', 'outcome_comparison_attestation_key_revocations', 'c', '467fdfe1c8d2ad1508dc4094c45c4d693c4c9dbfd9f5b9002355701db84b3648'),
          ('outcome_comparison_attestation_revocation_key_fkey', 'outcome_comparison_attestation_key_revocations', 'f', 'b4d11f63d5ec12be98308b1408aac8a606838f66a6543203e2ddb92cb09a9a49'),
          ('outcome_comparison_privacy_releases_pkey', 'outcome_comparison_privacy_releases', 'p', '8c8464f42472e42ee190fc91ca8db79b5351d3a4609040516578d229c56f6fa5'),
          ('outcome_comparison_release_attestation_shape_check', 'outcome_comparison_privacy_releases', 'c', '174425163a2eec048ad75aa8454b5761acdb30a1a539646b995a4814f7c64809')
      ),
      expected_policies(
        policy_name, table_name, command_name, role_name,
        expected_qual, expected_with_check
      ) AS (
        VALUES
          ('outcome_comparison_attestation_keys_provisioner', 'outcome_comparison_attestation_keys', 'SELECT', 'fluencytracr_c1_attestation_provisioner', 'true', NULL),
          ('outcome_comparison_attestation_keys_provisioner_insert', 'outcome_comparison_attestation_keys', 'INSERT', 'fluencytracr_c1_attestation_provisioner', NULL, 'true'),
          ('outcome_comparison_attestation_activations_provisioner', 'outcome_comparison_attestation_key_activations', 'SELECT', 'fluencytracr_c1_attestation_provisioner', 'true', NULL),
          ('outcome_comparison_attestation_activations_provisioner_insert', 'outcome_comparison_attestation_key_activations', 'INSERT', 'fluencytracr_c1_attestation_provisioner', NULL, 'true'),
          ('outcome_comparison_attestation_revocations_provisioner', 'outcome_comparison_attestation_key_revocations', 'SELECT', 'fluencytracr_c1_attestation_provisioner', 'true', NULL),
          ('outcome_comparison_attestation_revocations_provisioner_insert', 'outcome_comparison_attestation_key_revocations', 'INSERT', 'fluencytracr_c1_attestation_provisioner', NULL, 'true'),
          ('outcome_comparison_privacy_releases_runtime_select', 'outcome_comparison_privacy_releases', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('outcome_comparison_privacy_releases_runtime_insert', 'outcome_comparison_privacy_releases', 'INSERT', 'fluencytracr_c1_runtime', NULL, 'true'),
          ('cohort_producer_authorities_c1_runtime', 'cohort_producer_authorities', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('cohort_producer_authorities_c1_runtime_lock', 'cohort_producer_authorities', 'UPDATE', 'fluencytracr_c1_runtime', 'true', 'false'),
          ('cohort_producer_authority_revocations_c1_runtime', 'cohort_producer_authority_revocations', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('aggregate_privacy_reservations_c1_runtime', 'aggregate_privacy_reservations', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('cohort_proof_journal_c1_runtime', 'cohort_proof_journal', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('outcome_evidence_c1_runtime_select', 'outcome_evidence', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('ai_value_objects_c1_runtime_select', 'ai_value_objects', 'SELECT', 'fluencytracr_c1_runtime', 'true', NULL),
          ('ai_value_objects_c1_runtime_lock', 'ai_value_objects', 'UPDATE', 'fluencytracr_c1_runtime', 'true', 'false')
      ),
      expected_triggers(
        trigger_name, table_name, function_oid,
        fires_insert, fires_update, fires_delete
      ) AS (
        VALUES
          ('outcome_comparison_attestation_keys_append_only', 'outcome_comparison_attestation_keys', 'public.reject_mcii_privacy_authority_mutation()'::regprocedure, false, true, true),
          ('outcome_comparison_attestation_activations_append_only', 'outcome_comparison_attestation_key_activations', 'public.reject_mcii_privacy_authority_mutation()'::regprocedure, false, true, true),
          ('outcome_comparison_attestation_revocations_append_only', 'outcome_comparison_attestation_key_revocations', 'public.reject_mcii_privacy_authority_mutation()'::regprocedure, false, true, true),
          ('outcome_comparison_privacy_releases_append_only', 'outcome_comparison_privacy_releases', 'public.reject_mcii_privacy_authority_mutation()'::regprocedure, false, true, true),
          ('outcome_comparison_creation_attestation_before_insert', 'outcome_comparison_privacy_releases', 'public.stamp_outcome_comparison_creation_attestation()'::regprocedure, true, false, false),
          ('cohort_producer_authorities_append_only', 'cohort_producer_authorities', 'public.reject_mcii_privacy_authority_mutation()'::regprocedure, false, true, true),
          ('cohort_producer_authorities_c1_runtime_lock_only', 'cohort_producer_authorities', 'public.reject_c1_runtime_lock_only_mutation()'::regprocedure, false, true, false),
          ('ai_value_objects_c1_runtime_lock_only', 'ai_value_objects', 'public.reject_c1_runtime_lock_only_mutation()'::regprocedure, false, true, false),
          ('outcome_evidence_family_lock_before_mutation', 'outcome_evidence', 'public.lock_outcome_evidence_family_mutation()'::regprocedure, true, true, true)
      )
      SELECT (
        EXISTS (
          SELECT 1
          FROM pg_catalog.pg_extension AS extension
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = extension.extnamespace
          WHERE extension.extname = 'pgcrypto'
            AND namespace.nspname = 'public'
            AND extension.extowner = (SELECT datdba FROM pg_catalog.pg_database WHERE datname = current_database())
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_crypto AS expected
          JOIN pg_catalog.pg_proc AS proc
            ON proc.oid = expected.function_oid
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = proc.pronamespace
          JOIN pg_catalog.pg_language AS language
            ON language.oid = proc.prolang
          WHERE namespace.nspname <> 'public'
             OR proc.proowner <>
                (SELECT datdba FROM pg_catalog.pg_database WHERE datname = current_database())
             OR language.lanname <> 'c'
             OR proc.probin <> '$libdir/pgcrypto'
             OR proc.prosrc <> expected.source_symbol
             OR proc.provolatile <> 'i'
             OR proc.proparallel <> 's'
             OR NOT proc.proisstrict
             OR proc.prosecdef
             OR proc.proconfig IS NOT NULL
             OR NOT EXISTS (
               SELECT 1
               FROM pg_catalog.pg_depend AS dependency
               JOIN pg_catalog.pg_extension AS extension
                 ON extension.oid = dependency.refobjid
               WHERE dependency.classid = 'pg_catalog.pg_proc'::regclass
                 AND dependency.objid = proc.oid
                 AND dependency.refclassid =
                   'pg_catalog.pg_extension'::regclass
                 AND dependency.deptype = 'e'
                 AND extension.extname = 'pgcrypto'
             )
             OR EXISTS (
               SELECT 1
               FROM pg_catalog.aclexplode(
                 COALESCE(
                   proc.proacl,
                   pg_catalog.acldefault('f', proc.proowner)
                 )
               ) AS acl
               WHERE acl.privilege_type = 'EXECUTE'
                 AND acl.grantee <> proc.proowner
             )
             OR pg_catalog.has_function_privilege(
                  'fluencytracr_c1_runtime',
                  proc.oid,
                  'EXECUTE'
                )
        )
        AND (
          SELECT pg_catalog.count(*) FROM expected_crypto
        ) = 2
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_roles AS role_row
          WHERE role_row.rolname IN (
            'fluencytracr_c1_runtime',
            'fluencytracr_c1_attestation_provisioner'
          )
            AND NOT (
              role_row.rolcanlogin
              AND NOT role_row.rolsuper
              AND NOT role_row.rolcreatedb
              AND NOT role_row.rolcreaterole
              AND NOT role_row.rolinherit
              AND NOT role_row.rolreplication
              AND NOT role_row.rolbypassrls
            )
        )
        AND 2 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_roles
          WHERE rolname IN (
            'fluencytracr_c1_runtime',
            'fluencytracr_c1_attestation_provisioner'
          )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('fluencytracr_c1_runtime'),
            ('fluencytracr_c1_attestation_provisioner')
          ) AS restricted_role(role_name)
          WHERE pg_catalog.has_schema_privilege(
            restricted_role.role_name,
            'public',
            'CREATE'
          )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_auth_members AS membership
          JOIN pg_catalog.pg_roles AS member_role ON member_role.oid = membership.member
          JOIN pg_catalog.pg_roles AS granted_role ON granted_role.oid = membership.roleid
          WHERE member_role.rolname IN ('fluencytracr_c1_runtime', 'fluencytracr_c1_attestation_provisioner')
             OR granted_role.rolname IN ('fluencytracr_c1_runtime', 'fluencytracr_c1_attestation_provisioner')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_tables AS expected
          LEFT JOIN pg_catalog.pg_class AS table_row ON table_row.relname = expected.table_name
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace AND namespace.nspname = 'public'
          WHERE namespace.oid IS NULL
             OR table_row.relkind <> 'r'
             OR table_row.relowner <> (SELECT datdba FROM pg_catalog.pg_database WHERE datname = current_database())
             OR table_row.relrowsecurity <> expected.expected_rls
             OR table_row.relforcerowsecurity
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_constraints AS expected
          LEFT JOIN pg_catalog.pg_constraint AS constraint_row
            ON constraint_row.conname = expected.constraint_name
          LEFT JOIN pg_catalog.pg_class AS table_row
            ON table_row.oid = constraint_row.conrelid
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          WHERE constraint_row.oid IS NULL
             OR namespace.nspname <> 'public'
             OR table_row.relname <> expected.table_name
             OR constraint_row.contype::TEXT <> expected.constraint_type
             OR NOT constraint_row.convalidated
             OR pg_catalog.encode(
                  public.digest(
                    pg_catalog.convert_to(
                      pg_catalog.regexp_replace(
                        pg_catalog.btrim(
                          pg_catalog.pg_get_constraintdef(
                            constraint_row.oid,
                            false
                          )
                        ),
                        '\\s+',
                        ' ',
                        'g'
                      ),
                      'UTF8'
                    ),
                    'sha256'
                  ),
                  'hex'
                ) <> expected.definition_hash
             OR (
               constraint_row.contype = 'f'
               AND (
                 constraint_row.confupdtype <> 'r'
                 OR constraint_row.confdeltype <> 'r'
                 OR constraint_row.confrelid <> 'public.outcome_comparison_attestation_keys'::regclass
               )
             )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_columns AS expected
          LEFT JOIN pg_catalog.pg_class AS table_row
            ON table_row.relname = expected.table_name
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          LEFT JOIN pg_catalog.pg_attribute AS attribute
            ON attribute.attrelid = table_row.oid
           AND attribute.attname = expected.column_name
           AND attribute.attnum > 0
           AND NOT attribute.attisdropped
          WHERE namespace.nspname IS DISTINCT FROM 'public'
             OR attribute.attnum IS NULL
             OR NOT attribute.attnotnull
             OR pg_catalog.format_type(
                  attribute.atttypid,
                  attribute.atttypmod
                ) <> expected.type_name
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('outcome_comparison_attestation_keys', 4),
            ('outcome_comparison_attestation_key_activations', 3),
            ('outcome_comparison_attestation_key_revocations', 3)
          ) AS expected_count(table_name, column_count)
          WHERE (
            SELECT pg_catalog.count(*)
            FROM pg_catalog.pg_attribute AS attribute
            WHERE attribute.attrelid =
              ('public.' || expected_count.table_name)::regclass
              AND attribute.attnum > 0
              AND NOT attribute.attisdropped
          ) <> expected_count.column_count
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_policies AS expected
          LEFT JOIN pg_catalog.pg_policies AS policy
            ON policy.schemaname = 'public'
           AND policy.tablename = expected.table_name
           AND policy.policyname = expected.policy_name
          WHERE policy.policyname IS NULL
             OR policy.cmd <> expected.command_name
             OR policy.roles <> ARRAY[expected.role_name]::name[]
             OR policy.permissive <> 'PERMISSIVE'
             OR policy.qual IS DISTINCT FROM expected.expected_qual
             OR policy.with_check IS DISTINCT FROM expected.expected_with_check
        )
        AND (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_policies
          WHERE schemaname = 'public'
            AND tablename IN (
              SELECT table_name FROM expected_policies
            )
        ) = (SELECT pg_catalog.count(*) FROM expected_policies)
        AND NOT EXISTS (
          SELECT 1
          FROM expected_triggers AS expected
          LEFT JOIN pg_catalog.pg_trigger AS trigger_row
            ON trigger_row.tgname = expected.trigger_name
          LEFT JOIN pg_catalog.pg_class AS table_row ON table_row.oid = trigger_row.tgrelid
          LEFT JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = table_row.relnamespace
          WHERE trigger_row.oid IS NULL
             OR namespace.nspname <> 'public'
             OR table_row.relname <> expected.table_name
             OR trigger_row.tgfoid <> expected.function_oid
             OR trigger_row.tgattr <> ''::int2vector
             OR trigger_row.tgenabled NOT IN ('O', 'A')
             OR trigger_row.tgqual IS NOT NULL
             OR trigger_row.tgnargs <> 0
             OR (trigger_row.tgtype & 1) <> 1
             OR (trigger_row.tgtype & 2) <> 2
             OR ((trigger_row.tgtype & 4) = 4) <> expected.fires_insert
             OR ((trigger_row.tgtype & 8) = 8) <> expected.fires_delete
             OR ((trigger_row.tgtype & 16) = 16) <> expected.fires_update
        )
        AND (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_trigger AS trigger_row
          JOIN pg_catalog.pg_class AS table_row
            ON table_row.oid = trigger_row.tgrelid
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          WHERE NOT trigger_row.tgisinternal
            AND namespace.nspname = 'public'
            AND table_row.relname IN (
              SELECT table_name FROM expected_triggers
            )
        ) = (SELECT pg_catalog.count(*) FROM expected_triggers)
        AND NOT EXISTS (
          SELECT 1
          FROM expected_functions AS expected
          LEFT JOIN actual_functions AS actual USING (function_name)
          WHERE actual.oid IS NULL
             OR actual.identity_arguments <> expected.identity_arguments
             OR actual.return_type <> expected.return_type
             OR actual.security_definer <> expected.security_definer
             OR actual.volatility <> expected.volatility
             OR actual.function_language <> expected.function_language
             OR actual.function_binary IS DISTINCT FROM expected.function_binary
             OR actual.function_parallel <> expected.function_parallel
             OR actual.function_is_strict <> expected.function_is_strict
             OR actual.proowner <> (SELECT datdba FROM pg_catalog.pg_database WHERE datname = current_database())
             OR actual.proconfig IS DISTINCT FROM expected.expected_search_path
             OR actual.body_hash <> ALL(expected.allowed_body_hashes)
             OR EXISTS (
               SELECT 1
               FROM pg_catalog.aclexplode(
                 COALESCE(
                   actual.proacl,
                   pg_catalog.acldefault('f', actual.proowner)
                 )
               ) AS acl
               WHERE acl.grantee = 0
                 AND acl.privilege_type = 'EXECUTE'
             )
             OR EXISTS (
               SELECT 1
               FROM pg_catalog.aclexplode(
                 COALESCE(
                   actual.proacl,
                   pg_catalog.acldefault('f', actual.proowner)
                 )
               ) AS acl
               WHERE acl.privilege_type = 'EXECUTE'
                 AND acl.grantee NOT IN (
                   actual.proowner,
                   (
                     SELECT oid
                     FROM pg_catalog.pg_roles
                     WHERE rolname = 'fluencytracr_c1_runtime'
                   )
                 )
             )
             OR (
               pg_catalog.has_function_privilege('fluencytracr_c1_runtime', actual.oid, 'EXECUTE')
               <> expected.runtime_execute
             )
        )
        AND (
          SELECT pg_catalog.count(*) FROM actual_functions
        ) = (SELECT pg_catalog.count(*) FROM expected_functions)
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.outcome_comparison_privacy_releases',
          'SELECT'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.outcome_comparison_privacy_releases',
          'INSERT'
        )
        AND NOT pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime', 'public.outcome_comparison_privacy_releases', 'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.cohort_producer_authorities',
          'SELECT'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.cohort_producer_authorities',
          'UPDATE'
        )
        AND NOT pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime', 'public.cohort_producer_authorities',
          'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.ai_value_objects',
          'SELECT'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime',
          'public.ai_value_objects',
          'UPDATE'
        )
        AND NOT pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime', 'public.ai_value_objects',
          'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime', 'public.outcome_evidence', 'SELECT'
        )
        AND NOT pg_catalog.has_table_privilege(
          'fluencytracr_c1_runtime', 'public.outcome_evidence',
          'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('cohort_producer_authority_revocations'),
                ('aggregate_privacy_reservations'),
                ('cohort_proof_journal'),
                ('aggregate_privacy_release_journal')
          ) AS read_only(table_name)
          WHERE NOT pg_catalog.has_table_privilege(
                  'fluencytracr_c1_runtime',
                  'public.' || read_only.table_name,
                  'SELECT'
                )
             OR pg_catalog.has_table_privilege(
                  'fluencytracr_c1_runtime',
                  'public.' || read_only.table_name,
                  'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('aggregate_privacy_manifests'),
            ('aggregate_privacy_contribution_claims')
          ) AS inaccessible(table_name)
          WHERE pg_catalog.has_table_privilege(
            'fluencytracr_c1_runtime',
            'public.' || inaccessible.table_name,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
          )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('outcome_comparison_attestation_keys'),
            ('outcome_comparison_attestation_key_activations'),
            ('outcome_comparison_attestation_key_revocations')
          ) AS key_table(table_name)
          WHERE NOT pg_catalog.has_table_privilege(
                  'fluencytracr_c1_attestation_provisioner',
                  'public.' || key_table.table_name,
                  'SELECT'
                )
             OR NOT pg_catalog.has_table_privilege(
                  'fluencytracr_c1_attestation_provisioner',
                  'public.' || key_table.table_name,
                  'INSERT'
                )
             OR pg_catalog.has_table_privilege(
                  'fluencytracr_c1_attestation_provisioner',
                  'public.' || key_table.table_name,
                  'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                )
             OR pg_catalog.has_table_privilege(
                  'fluencytracr_c1_runtime',
                  'public.' || key_table.table_name,
                  'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM provisioner_forbidden_table AS forbidden
          WHERE pg_catalog.has_table_privilege(
            'fluencytracr_c1_attestation_provisioner',
            forbidden.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
          )
        )
        AND EXISTS (
          SELECT 1
          FROM expected_activation_sequence AS expected
          JOIN pg_catalog.pg_class AS sequence_row
            ON sequence_row.oid = expected.oid
          WHERE sequence_row.relkind = 'S'
            AND sequence_row.relowner = (
              SELECT datdba
              FROM pg_catalog.pg_database
              WHERE datname = current_database()
            )
            AND pg_catalog.has_sequence_privilege(
              'fluencytracr_c1_attestation_provisioner',
              sequence_row.oid,
              'USAGE'
            )
            AND pg_catalog.has_sequence_privilege(
              'fluencytracr_c1_attestation_provisioner',
              sequence_row.oid,
              'SELECT'
            )
            AND NOT pg_catalog.has_sequence_privilege(
              'fluencytracr_c1_attestation_provisioner',
              sequence_row.oid,
              'UPDATE'
            )
            AND NOT EXISTS (
              SELECT 1
              FROM pg_catalog.aclexplode(
                COALESCE(
                  sequence_row.relacl,
                  pg_catalog.acldefault('S', sequence_row.relowner)
                )
              ) AS acl
              WHERE acl.grantee NOT IN (
                sequence_row.relowner,
                (
                  SELECT oid
                  FROM pg_catalog.pg_roles
                  WHERE rolname = 'fluencytracr_c1_attestation_provisioner'
                )
              )
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM provisioner_forbidden_sequence AS forbidden
          JOIN pg_catalog.pg_class AS sequence_row
            ON sequence_row.oid = forbidden.oid
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              sequence_row.relacl,
              pg_catalog.acldefault('S', sequence_row.relowner)
            )
          ) AS acl
          WHERE acl.privilege_type IN ('USAGE', 'SELECT', 'UPDATE')
            AND acl.grantee IN (
              0,
              (
                SELECT oid
                FROM pg_catalog.pg_roles
                WHERE rolname = 'fluencytracr_c1_attestation_provisioner'
              )
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS table_row
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              table_row.relacl,
              pg_catalog.acldefault('r', table_row.relowner)
            )
          ) AS acl
          WHERE namespace.nspname = 'public'
            AND table_row.relname IN (
              SELECT table_name FROM expected_tables
            )
            AND acl.grantee NOT IN (
              table_row.relowner,
              (
                SELECT oid FROM pg_catalog.pg_roles
                WHERE rolname = 'fluencytracr_c1_runtime'
              ),
              (
                SELECT oid FROM pg_catalog.pg_roles
                WHERE rolname = 'fluencytracr_c1_attestation_provisioner'
              )
            )
        )
      ) AS ok
    `);
    return rows.length === 1 && rows[0]?.ok === true;
  } catch {
    return false;
  }
};
