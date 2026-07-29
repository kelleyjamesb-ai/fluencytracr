type StructureReadinessClient = {
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
};

export const checkCanonicalIdentityFamilyHeadStructureReadiness = async (
  client: StructureReadinessClient
): Promise<boolean> => {
  try {
    const rows = await client.$queryRawUnsafe<Array<{ ok: boolean }>>(`
      /* canonical_identity_family_head_structure */
      WITH expected_roles(role_name, can_login) AS (
        VALUES
          ('fluencytracr_slice_e_owner', false),
          ('fluencytracr_slice_e_runtime', true)
      ),
      expected_tables(table_name) AS (
        VALUES
          ('value_hypotheses'),
          ('measurement_plans'),
          ('measurement_cell_snapshots'),
          ('ai_value_canonical_identity_family_head_journal')
      ),
      expected_columns(
        column_name, type_name, not_null, default_expression
      ) AS (
        VALUES
          ('source_kind', 'text', true, NULL),
          ('org_id', 'text', true, NULL),
          ('stable_source_id', 'text', true, NULL),
          ('version', 'integer', true, NULL),
          ('source_row_id', 'uuid', true, NULL),
          ('predecessor_row_id', 'uuid', false, NULL),
          ('source_semantic_commitment', 'text', false, NULL),
          ('source_attestation_commitment', 'text', false, NULL),
          ('attestation_state', 'text', true, NULL),
          ('created_at', 'timestamp(3) with time zone', true, 'CURRENT_TIMESTAMP')
      ),
      expected_constraints(
        constraint_name, constraint_type, definition_hash
      ) AS (
        VALUES
          (
            'ai_value_canonical_identity_family_head_journal_pkey',
            'p',
            '784f7bf5a946f503811dfb27d3eff11a040bba1d8b29fe22af5ac3aa437e8f2d'
          ),
          (
            'canonical_identity_family_source_kind_check',
            'c',
            '6bc9d2f84df1c8d9b86fe1e1baf1f13c2596f7f670f6c30bece9afdac706eecb'
          ),
          (
            'canonical_identity_family_identity_check',
            'c',
            'd300e0336a8051aa7b6452e51bc4e24a4a75c89fcc00f9df4928a4c643b6fe8a'
          ),
          (
            'canonical_identity_family_root_check',
            'c',
            'dd92f3a41aa9c15063fff69d56a0975814cc720af3ec59d616648ee9f886b3fd'
          ),
          (
            'canonical_identity_family_attestation_check',
            'c',
            'b02099840ff2bb3305820f78298cd405f3e9578f3d1194c5201df89563ea5207'
          )
      ),
      expected_indexes(
        index_name, is_unique, is_primary, definition_hash
      ) AS (
        VALUES
          (
            'ai_value_canonical_identity_family_head_journal_pkey',
            true,
            true,
            'b84e15d8e592dbd5258add8799f1db804d2f71d2f995b7d779dae746d4f665da'
          ),
          (
            'canonical_identity_family_source_row_key',
            true,
            false,
            '3044678c3cf03e2445fe3b10c1f15691884ed63c9460739f225b424d2b34f5ec'
          ),
          (
            'canonical_identity_family_tail_idx',
            false,
            false,
            'eb7f50c186b660d0703aac201db1cec8e2a179af310e878b2bdb20f05b082cc1'
          )
      ),
      expected_functions(
        function_name, identity_arguments, return_type, security_definer,
        volatility, function_language, function_parallel, function_is_strict,
        expected_search_path, expected_body_hash, runtime_execute
      ) AS (
        VALUES
          (
            'canonical_identity_family_lock_key',
            'source_kind_value text, org_id_value text, stable_source_id_value text',
            'text', false, 'i', 'sql', 's', true,
            ARRAY['search_path=pg_catalog']::TEXT[],
            '13f235a59fb115c832efe43d4403c1f29fc32b5a84602099080dbac4edcbab19',
            true
          ),
          (
            'canonical_identity_source_commitments',
            'source_kind_value text, validation_value jsonb',
            'TABLE(source_semantic_commitment text, source_attestation_commitment text, attestation_state text)',
            false, 'i', 'plpgsql', 's', true,
            ARRAY['search_path=pg_catalog']::TEXT[],
            '412f68982c6caad56d7e481db9e22bf7672816940699e28dc67a38112965e4f3',
            false
          ),
          (
            'append_canonical_identity_family_head',
            '', 'trigger', true, 'v', 'plpgsql', 'u', false,
            ARRAY['search_path=pg_catalog']::TEXT[],
            'ad42db9d95b1f4d492a38fafe68e7115da48255ee6564ebfa22acb5c8caf988b',
            false
          ),
          (
            'reject_canonical_identity_source_mutation',
            '', 'trigger', true, 'v', 'plpgsql', 'u', false,
            ARRAY['search_path=pg_catalog']::TEXT[],
            'fdea64041df79fde0b630937878c403df522819b6c109e34ee2d34472b6114d5',
            false
          )
      ),
      actual_functions AS (
        SELECT
          proc.proname AS function_name,
          pg_catalog.pg_get_function_identity_arguments(proc.oid)
            AS identity_arguments,
          pg_catalog.pg_get_function_result(proc.oid) AS return_type,
          proc.prosecdef AS security_definer,
          proc.provolatile AS volatility,
          language.lanname AS function_language,
          proc.proparallel AS function_parallel,
          proc.proisstrict AS function_is_strict,
          proc.proowner,
          proc.proconfig,
          proc.proacl,
          pg_catalog.encode(
            pg_catalog.sha256(
              pg_catalog.convert_to(
                pg_catalog.regexp_replace(
                  pg_catalog.btrim(proc.prosrc),
                  '\\s+',
                  ' ',
                  'g'
                ),
                'UTF8'
              )
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
          AND proc.proname IN (
            SELECT function_name FROM expected_functions
          )
      ),
      expected_triggers(
        trigger_name, table_name, function_oid,
        fires_insert, fires_update, fires_delete, fires_before
      ) AS (
        VALUES
          (
            'value_hypotheses_canonical_identity_append',
            'value_hypotheses',
            'public.append_canonical_identity_family_head()'::regprocedure,
            true, false, false, false
          ),
          (
            'measurement_plans_canonical_identity_append',
            'measurement_plans',
            'public.append_canonical_identity_family_head()'::regprocedure,
            true, false, false, false
          ),
          (
            'measurement_cell_snapshots_canonical_identity_append',
            'measurement_cell_snapshots',
            'public.append_canonical_identity_family_head()'::regprocedure,
            true, false, false, false
          ),
          (
            'value_hypotheses_canonical_identity_append_only',
            'value_hypotheses',
            'public.reject_canonical_identity_source_mutation()'::regprocedure,
            false, true, true, true
          ),
          (
            'measurement_plans_canonical_identity_append_only',
            'measurement_plans',
            'public.reject_canonical_identity_source_mutation()'::regprocedure,
            false, true, true, true
          ),
          (
            'measurement_cell_snapshots_canonical_identity_append_only',
            'measurement_cell_snapshots',
            'public.reject_canonical_identity_source_mutation()'::regprocedure,
            false, true, true, true
          ),
          (
            'canonical_identity_family_head_journal_append_only',
            'ai_value_canonical_identity_family_head_journal',
            'public.reject_canonical_identity_source_mutation()'::regprocedure,
            false, true, true, true
          )
      ),
      expected_policies(
        policy_name, table_name, command_name, expected_qual,
        expected_with_check
      ) AS (
        VALUES
          (
            'value_hypotheses_slice_e_runtime_select',
            'value_hypotheses', 'SELECT', 'true', NULL
          ),
          (
            'value_hypotheses_slice_e_runtime_insert',
            'value_hypotheses', 'INSERT', NULL, 'true'
          ),
          (
            'measurement_plans_slice_e_runtime_select',
            'measurement_plans', 'SELECT', 'true', NULL
          ),
          (
            'measurement_plans_slice_e_runtime_insert',
            'measurement_plans', 'INSERT', NULL, 'true'
          ),
          (
            'measurement_cell_snapshots_slice_e_runtime_select',
            'measurement_cell_snapshots', 'SELECT', 'true', NULL
          ),
          (
            'measurement_cell_snapshots_slice_e_runtime_insert',
            'measurement_cell_snapshots', 'INSERT', NULL, 'true'
          ),
          (
            'canonical_identity_family_head_slice_e_runtime_select',
            'ai_value_canonical_identity_family_head_journal',
            'SELECT', 'true', NULL
          )
      )
      SELECT (
        2 = (
          SELECT pg_catalog.count(*)
          FROM expected_roles AS expected
          JOIN pg_catalog.pg_roles AS role_row
            ON role_row.rolname = expected.role_name
          WHERE role_row.rolcanlogin = expected.can_login
            AND NOT role_row.rolsuper
            AND NOT role_row.rolcreatedb
            AND NOT role_row.rolcreaterole
            AND NOT role_row.rolinherit
            AND NOT role_row.rolreplication
            AND NOT role_row.rolbypassrls
        )
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_auth_members AS membership
          JOIN pg_catalog.pg_roles AS member_role
            ON member_role.oid = membership.member
          JOIN pg_catalog.pg_roles AS granted_role
            ON granted_role.oid = membership.roleid
          WHERE member_role.rolname IN (
              'fluencytracr_slice_e_owner',
              'fluencytracr_slice_e_runtime'
            )
             OR granted_role.rolname IN (
              'fluencytracr_slice_e_owner',
              'fluencytracr_slice_e_runtime'
            )
        )
        AND NOT pg_catalog.has_schema_privilege(
          'fluencytracr_slice_e_runtime',
          'public',
          'CREATE'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_tables AS expected
          LEFT JOIN pg_catalog.pg_class AS table_row
            ON table_row.relname = expected.table_name
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
           AND namespace.nspname = 'public'
          WHERE namespace.oid IS NULL
             OR table_row.relkind <> 'r'
             OR table_row.relowner <> (
               SELECT oid FROM pg_catalog.pg_roles
               WHERE rolname = 'fluencytracr_slice_e_owner'
             )
             OR NOT table_row.relrowsecurity
             OR table_row.relforcerowsecurity
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_columns AS expected
          LEFT JOIN pg_catalog.pg_attribute AS attribute
            ON attribute.attrelid =
              'public.ai_value_canonical_identity_family_head_journal'::regclass
           AND attribute.attname = expected.column_name
           AND attribute.attnum > 0
           AND NOT attribute.attisdropped
          LEFT JOIN pg_catalog.pg_attrdef AS attribute_default
            ON attribute_default.adrelid = attribute.attrelid
           AND attribute_default.adnum = attribute.attnum
          WHERE attribute.attnum IS NULL
             OR pg_catalog.format_type(
                  attribute.atttypid,
                  attribute.atttypmod
                ) <> expected.type_name
             OR attribute.attnotnull <> expected.not_null
             OR pg_catalog.pg_get_expr(
                  attribute_default.adbin,
                  attribute_default.adrelid
                ) IS DISTINCT FROM expected.default_expression
        )
        AND 10 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid =
            'public.ai_value_canonical_identity_family_head_journal'::regclass
            AND attribute.attnum > 0
            AND NOT attribute.attisdropped
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_constraints AS expected
          LEFT JOIN pg_catalog.pg_constraint AS constraint_row
            ON constraint_row.conname = expected.constraint_name
           AND constraint_row.conrelid =
             'public.ai_value_canonical_identity_family_head_journal'::regclass
          WHERE constraint_row.oid IS NULL
             OR constraint_row.contype::TEXT <> expected.constraint_type
             OR NOT constraint_row.convalidated
             OR pg_catalog.encode(
                  pg_catalog.sha256(
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
                    )
                  ),
                  'hex'
                ) <> expected.definition_hash
        )
        AND 5 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_constraint
          WHERE conrelid =
            'public.ai_value_canonical_identity_family_head_journal'::regclass
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_indexes AS expected
          LEFT JOIN pg_catalog.pg_class AS index_row
            ON index_row.relname = expected.index_name
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = index_row.relnamespace
           AND namespace.nspname = 'public'
          LEFT JOIN pg_catalog.pg_index AS index_definition
            ON index_definition.indexrelid = index_row.oid
           AND index_definition.indrelid =
             'public.ai_value_canonical_identity_family_head_journal'::regclass
          WHERE namespace.oid IS NULL
             OR index_definition.indexrelid IS NULL
             OR index_definition.indisunique <> expected.is_unique
             OR index_definition.indisprimary <> expected.is_primary
             OR NOT index_definition.indisvalid
             OR NOT index_definition.indisready
             OR pg_catalog.encode(
                  pg_catalog.sha256(
                    pg_catalog.convert_to(
                      pg_catalog.regexp_replace(
                        pg_catalog.btrim(
                          pg_catalog.pg_get_indexdef(
                            index_definition.indexrelid
                          )
                        ),
                        '\\s+',
                        ' ',
                        'g'
                      ),
                      'UTF8'
                    )
                  ),
                  'hex'
                ) <> expected.definition_hash
        )
        AND 3 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_index
          WHERE indrelid =
            'public.ai_value_canonical_identity_family_head_journal'::regclass
        )
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
             OR actual.function_parallel <> expected.function_parallel
             OR actual.function_is_strict <> expected.function_is_strict
             OR actual.proowner <> (
               SELECT oid FROM pg_catalog.pg_roles
               WHERE rolname = 'fluencytracr_slice_e_owner'
             )
             OR actual.proconfig IS DISTINCT FROM expected.expected_search_path
             OR actual.body_hash <> expected.expected_body_hash
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
                     SELECT oid FROM pg_catalog.pg_roles
                     WHERE rolname = 'fluencytracr_slice_e_runtime'
                   )
                 )
             )
             OR pg_catalog.has_function_privilege(
                  'fluencytracr_slice_e_runtime',
                  actual.oid,
                  'EXECUTE'
                ) <> expected.runtime_execute
        )
        AND 4 = (SELECT pg_catalog.count(*) FROM actual_functions)
        AND NOT EXISTS (
          SELECT 1
          FROM expected_triggers AS expected
          LEFT JOIN pg_catalog.pg_trigger AS trigger_row
            ON trigger_row.tgname = expected.trigger_name
          LEFT JOIN pg_catalog.pg_class AS table_row
            ON table_row.oid = trigger_row.tgrelid
          LEFT JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          WHERE trigger_row.oid IS NULL
             OR namespace.nspname <> 'public'
             OR table_row.relname <> expected.table_name
             OR trigger_row.tgfoid <> expected.function_oid
             OR trigger_row.tgattr <> ''::int2vector
             OR trigger_row.tgenabled NOT IN ('O', 'A')
             OR trigger_row.tgqual IS NOT NULL
             OR trigger_row.tgnargs <> 0
             OR (trigger_row.tgtype & 1) <> 1
             OR ((trigger_row.tgtype & 2) = 2) <> expected.fires_before
             OR ((trigger_row.tgtype & 4) = 4) <> expected.fires_insert
             OR ((trigger_row.tgtype & 8) = 8) <> expected.fires_delete
             OR ((trigger_row.tgtype & 16) = 16) <> expected.fires_update
        )
        AND 7 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_trigger AS trigger_row
          JOIN pg_catalog.pg_class AS table_row
            ON table_row.oid = trigger_row.tgrelid
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
          WHERE NOT trigger_row.tgisinternal
            AND namespace.nspname = 'public'
            AND table_row.relname IN (
              SELECT table_name FROM expected_tables
            )
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
             OR policy.roles <>
               ARRAY['fluencytracr_slice_e_runtime']::name[]
             OR policy.permissive <> 'PERMISSIVE'
             OR policy.qual IS DISTINCT FROM expected.expected_qual
             OR policy.with_check IS DISTINCT FROM expected.expected_with_check
        )
        AND 7 = (
          SELECT pg_catalog.count(*)
          FROM pg_catalog.pg_policies
          WHERE schemaname = 'public'
            AND tablename IN (
              SELECT table_name FROM expected_tables
            )
        )
        AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            ('value_hypotheses'),
            ('measurement_plans'),
            ('measurement_cell_snapshots')
          ) AS source_table(table_name)
          WHERE NOT pg_catalog.has_table_privilege(
                  'fluencytracr_slice_e_runtime',
                  'public.' || source_table.table_name,
                  'SELECT'
                )
             OR NOT pg_catalog.has_table_privilege(
                  'fluencytracr_slice_e_runtime',
                  'public.' || source_table.table_name,
                  'INSERT'
                )
             OR pg_catalog.has_table_privilege(
                  'fluencytracr_slice_e_runtime',
                  'public.' || source_table.table_name,
                  'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                )
        )
        AND pg_catalog.has_table_privilege(
          'fluencytracr_slice_e_runtime',
          'public.ai_value_canonical_identity_family_head_journal',
          'SELECT'
        )
        AND NOT pg_catalog.has_table_privilege(
          'fluencytracr_slice_e_runtime',
          'public.ai_value_canonical_identity_family_head_journal',
          'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM expected_tables AS expected
          JOIN pg_catalog.pg_class AS table_row
            ON table_row.relname = expected.table_name
          JOIN pg_catalog.pg_namespace AS namespace
            ON namespace.oid = table_row.relnamespace
           AND namespace.nspname = 'public'
          CROSS JOIN LATERAL pg_catalog.aclexplode(
            COALESCE(
              table_row.relacl,
              pg_catalog.acldefault('r', table_row.relowner)
            )
          ) AS acl
          WHERE acl.grantee NOT IN (
            table_row.relowner,
            (
              SELECT oid FROM pg_catalog.pg_roles
              WHERE rolname = 'fluencytracr_slice_e_runtime'
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
