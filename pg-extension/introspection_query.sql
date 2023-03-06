with view_source_columns as (
    with recursive pks_fks as (
        -- pk + fk referencing col
        select
          conrelid as resorigtbl,
          unnest(conkey) as resorigcol
        from pg_constraint
        where contype IN ('p', 'f')
        union
        -- fk referenced col
        select
          confrelid,
          unnest(confkey)
        from pg_constraint
        where contype='f'
      ),
      views as (
        select
          c.oid       as view_id,
          n.nspname   as view_schema,
          n.oid       as view_schema_oid,
          c.relname   as view_name,
          r.ev_action as view_definition
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_rewrite r on r.ev_class = c.oid
        where c.relkind in ('v', 'm') and n.nspname = ANY($1)
      ),
      transform_json as (
        select
          view_id, view_schema, view_schema_oid, view_name,
          -- the following formatting is without indentation on purpose
          -- to allow simple diffs, with less whitespace noise
          replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            regexp_replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace(
              view_definition::text,
            -- This conversion to json is heavily optimized for performance.
            -- The general idea is to use as few regexp_replace() calls as possible.
            -- Simple replace() is a lot faster, so we jump through some hoops
            -- to be able to use regexp_replace() only once.
            -- This has been tested against a huge schema with 250+ different views.
            -- The unit tests do NOT reflect all possible inputs. Be careful when changing this!
            -- -----------------------------------------------
            -- pattern           | replacement         | flags
            -- -----------------------------------------------
            -- '<>' in pg_node_tree is the same as 'null' in JSON, but due to very poor performance of json_typeof
            -- we need to make this an empty array here to prevent json_array_elements from throwing an error
            -- when the targetList is null.
            -- We'll need to put it first, to make the node protection below work for node lists that start with
            -- null: '(<> ...', too. This is the case for coldefexprs, when the first column does not have a default value.
               '<>'              , '()'
            -- ',' is not part of the pg_node_tree format, but used in the regex.
            -- This removes all ',' that might be part of column names.
            ), ','               , ''
            -- The same applies for '{' and '}', although those are used a lot in pg_node_tree.
            -- We remove the escaped ones, which might be part of column names again.
            ), E'\\{'            , ''
            ), E'\\}'            , ''
            -- The fields we need are formatted as json manually to protect them from the regex.
            ), ' :targetList '   , ',"targetList":'
            ), ' :resno '        , ',"resno":'
            ), ' :resorigtbl '   , ',"resorigtbl":'
            ), ' :resorigcol '   , ',"resorigcol":'
            -- Make the regex also match the node type, e.g. '{QUERY ...', to remove it in one pass.
            ), '{'               , '{ :'
            -- Protect node lists, which start with '({' or '((' from the greedy regex.
            -- The extra '{' is removed again later.
            ), '(('              , '{(('
            ), '({'              , '{({'
            -- This regex removes all unused fields to avoid the need to format all of them correctly.
            -- This leads to a smaller json result as well.
            -- Removal stops at ',' for used fields (see above) and '}' for the end of the current node.
            -- Nesting can't be parsed correctly with a regex, so we stop at '{' as well and
            -- add an empty key for the followig node.
            ), ' :[^}{,]+'       , ',"":'              , 'g'
            -- For performance, the regex also added those empty keys when hitting a ',' or '}'.
            -- Those are removed next.
            ), ',"":}'           , '}'
            ), ',"":,'           , ','
            -- This reverses the "node list protection" from above.
            ), '{('              , '('
            -- Every key above has been added with a ',' so far. The first key in an object doesn't need it.
            ), '{,'              , '{'
            -- pg_node_tree has '()' around lists, but JSON uses '[]'
            ), '('               , '['
            ), ')'               , ']'
            -- pg_node_tree has ' ' between list items, but JSON uses ','
            ), ' '             , ','
          )::json as view_definition
        from views
      ),
      target_entries as(
        select
          view_id, view_schema, view_schema_oid, view_name,
          json_array_elements(view_definition->0->'targetList') as entry
        from transform_json
      ),
      results as(
        select
          view_id, view_schema, view_schema_oid, view_name,
          (entry->>'resno')::int as view_column,
          (entry->>'resorigtbl')::oid as resorigtbl,
          (entry->>'resorigcol')::int as resorigcol
        from target_entries
      ),
      recursion as(
        select r.*
        from results r
        where view_schema = ANY ($1)
        union all
        select
          view.view_id,
          view.view_schema,
          view.view_schema_oid,
          view.view_name,
          view.view_column,
          tab.resorigtbl,
          tab.resorigcol
        from recursion view
        join results tab on view.resorigtbl=tab.view_id and view.resorigcol=tab.view_column
      )
      select
        sch.oid     as table_schema_oid,
        sch.nspname as table_schema,
        tbl.relname as table_name,
        tbl.oid     as table_oid,
        col.attname as table_column_name,
        rec.view_schema,
        rec.view_schema_oid,
        rec.view_name,
        rec.view_id as view_oid,
        vcol.attname as view_column_name
      from recursion rec
      join pg_class tbl on tbl.oid = rec.resorigtbl
      join pg_attribute col on col.attrelid = tbl.oid and col.attnum = rec.resorigcol
      join pg_attribute vcol on vcol.attrelid = rec.view_id and vcol.attnum = rec.view_column
      join pg_namespace sch on sch.oid = tbl.relnamespace
      join pks_fks using (resorigtbl, resorigcol)
      order by view_schema, view_name, view_column_name

),

schemas as (
    select
      n.oid as schema_oid,
      n.nspname as schema_name,
      description as schema_description
    from
      pg_namespace n
      left join pg_description d on d.objoid = n.oid
    where
      n.nspname = any ($1)
),

functions as (
  with
  base_types as (
    with recursive
    recurse as (
      select
        oid,
        typbasetype,
        coalesce(nullif(typbasetype, 0), oid) as base
      from pg_type
      union
      select
        t.oid,
        b.typbasetype,
        coalesce(nullif(b.typbasetype, 0), b.oid) as base
      from recurse t
      join pg_type b on t.typbasetype = b.oid
    )
    select
      oid,
      base
    from recurse
    where typbasetype = 0
  ),
  arguments as (
    select
      oid,
      json_agg(
        json_build_object(
          'name', coalesce(name, ''),
          'type', type::regtype::text,
          'required', idx <= (pronargs - pronargdefaults),
          'variadic', coalesce(mode = 'v', false)
        )
        order by idx <= (pronargs - pronargdefaults)
      ) as args
    from pg_proc,
         unnest(proargnames, proargtypes, proargmodes)
           with ordinality as _ (name, type, mode, idx)
    where type is not null -- only input arguments
    group by oid
  )
  select
    pn.oid as function_schema_oid,
    pn.nspname as function_schema,
    p.proname as function_name,
    --d.description as proc_description,
    coalesce(a.args, '[]') as parameters,
    tn.nspname as return_type_schema,
    coalesce(comp.relname, t.typname) as return_type,
    comp.oid as return_type_oid,
    p.proretset as setof,
    (t.typtype = 'c'
     -- if any table, inout or out arguments present, treat as composite
     or coalesce(proargmodes::text[] && '{t,b,o}', false)
    ) as composite,
    p.provolatile as volatile,
    p.provariadic > 0 as variadic
  from pg_proc p
  left join arguments a on a.oid = p.oid
  join pg_namespace pn on pn.oid = p.pronamespace
  join base_types bt on bt.oid = p.prorettype
  join pg_type t on t.oid = bt.base
  join pg_namespace tn on tn.oid = t.typnamespace
  left join pg_class comp on comp.oid = t.typrelid
  left join pg_catalog.pg_description as d on d.objoid = p.oid
  
  where pn.nspname = any ($1)
  order by function_schema, function_name
),

-- This includes views
tables as (
    select
      n.oid as schema_oid,
      c.oid as table_oid,
      n.nspname as table_schema,
      c.relname as table_name,
      d.description as table_description,
      c.relkind as relkind,
      (
        c.relkind in ('r', 'v', 'f', 'p')

        and pg_relation_is_updatable(c.oid, true) & 8 = 8

        -- The function 'pg_relation_is_updateable' returns a bitmask where 8
        -- corresponds to '1 << CMD_INSERT' in the PostgreSQL source code, i.e.
        -- it's possible to insert into the relation.
        or exists (
          select 1
          from pg_trigger
          where
            pg_trigger.tgrelid = c.oid
            and (pg_trigger.tgtype::integer & 69) = 69
            -- The trigger type 'tgtype' is a bitmask where 69 corresponds to
            -- TRIGGER_TYPE_ROW + TRIGGER_TYPE_INSTEAD + TRIGGER_TYPE_INSERT
            -- in the PostgreSQL source code.
        )
      ) as table_insertable,
      (
        pg_has_role(c.relowner, 'USAGE')
        or has_table_privilege(c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
        or has_any_column_privilege(c.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
      ) as table_is_accessible
    from
      pg_class c
      join pg_namespace n
        on n.oid = c.relnamespace
      left join pg_catalog.pg_description as d
        on d.objoid = c.oid and d.objsubid = 0
    where
      c.relkind in ('v','r','m','f', 'p')
      and n.nspname not in ('pg_catalog'::name, 'information_schema'::name)
      and not c.relispartition -- remove this for pg < 10
),

table_primary_keys as (
    select
      r.oid as pk_table_oid,
      --a.attnum as pk_col_position,
      a.attname as pk_col_name
    from
      pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace nr on nr.oid = r.relnamespace
      join pg_attribute a on a.attrelid = r.oid
      , unnest(c.conkey) as con(key)
    where
      c.contype = 'p'
      and r.relkind IN ('r', 'p')
      --and nr.nspname not in ('pg_catalog', 'information_schema')
      and nr.nspname = any($1::name[])
      and not pg_is_other_temp_schema(nr.oid)
      and a.attnum = con.key
      and not a.attisdropped
),

view_primary_keys as (
    select
        view_cols.view_oid as pk_table_oid,
        view_cols.view_column_name as pk_col_name
    from
      table_primary_keys pks
      join view_source_columns view_cols
        on view_cols.table_oid = pks.pk_table_oid
),

primary_keys as (
    select * from table_primary_keys
    union all
    select * from view_primary_keys
),

columns as (
    select
      a.attrelid as col_table_oid,
    --   a.attnum as col_position,
      a.attname as col_name,
      d.description as col_description,
      pg_get_expr(ad.adbin, ad.adrelid)::text as col_default,
      not (a.attnotnull or t.typtype = 'd' and t.typnotnull) as col_nullable,
      case
        when t.typtype = 'd' then
          case
            when bt.typelem <> 0::oid and bt.typlen = (-1) then
              'ARRAY'::text
            when nbt.nspname = 'pg_catalog'::name then
              format_type(t.typbasetype, null::integer)
            else
              format_type(a.atttypid, a.atttypmod)
          end
        else
          case
            when t.typelem <> 0::oid and t.typlen = (-1) then
              'ARRAY'
            when nt.nspname = 'pg_catalog'::name then
              format_type(a.atttypid, null::integer)
            else
              format_type(a.atttypid, a.atttypmod)
          end
      end as col_type,
      information_schema._pg_char_max_length(truetypid, truetypmod) as col_max_len,
      information_schema._pg_numeric_precision(truetypid, truetypmod) as col_precision,
      (
        c.relkind in ('r', 'v', 'f', 'p')
        and pg_column_is_updatable(c.oid::regclass, a.attnum, false)
      ) col_updatable,
      coalesce(enum_info.vals, array[]::text[]) as col_enum,
      pks is not null as col_is_primary_key
    from
      pg_attribute a
      left join pg_description d on d.objoid = a.attrelid and d.objsubid = a.attnum
      left join pg_attrdef ad on a.attrelid = ad.adrelid and a.attnum = ad.adnum
      join pg_class c on c.oid = a.attrelid
      join pg_namespace nc on nc.oid = c.relnamespace
      join pg_type t on t.oid = a.atttypid
      join pg_namespace nt on t.typnamespace = nt.oid
      left join pg_type bt on t.typtype = 'd' and t.typbasetype = bt.oid
      left join pg_namespace nbt on bt.typnamespace = nbt.oid
      left join primary_keys pks
        on
          pks.pk_table_oid = a.attrelid
          and pks.pk_col_name = a.attname
      , lateral (
          select array_agg(e.enumlabel order by e.enumsortorder) as vals
          from
            pg_type et
            join pg_enum e on et.oid = e.enumtypid
          where
            et.oid = t.oid
      ) as enum_info
      , information_schema._pg_truetypid(a.*, t.*) truetypid
      , information_schema._pg_truetypmod(a.*, t.*) truetypmod
    where
      a.attnum <> 0
      and a.attname not in ('tableoid','cmax','xmax','cmin','xmin','ctid')
      and not a.attisdropped
      and c.relkind in ('r', 'v', 'f', 'm', 'p')
      --and (nc.nspname = any ($1::name[]) or pks is not null)
      and nc.nspname = any ($1::name[])
      and not pg_is_other_temp_schema(c.relnamespace)
),

table_table_relations as (
    select conname     as constraint_name,
           ns1.nspname as table_schema,
           tab.relname as table_name,
           tab.oid     as table_oid,
           column_info.cols as columns,
           ns2.nspname   as foreign_table_schema,
           other.relname as foreign_table_name,
           other.oid     as foreign_table_oid,
           column_info.refs as foreign_columns
    from pg_constraint,
    lateral (
      select array_agg(cols.attname) as cols,
                    array_agg(cols.attnum)  as nums,
                    array_agg(refs.attname) as refs
      from ( select unnest(conkey) as col, unnest(confkey) as ref) k,
      lateral (select * from pg_attribute where attrelid = conrelid and attnum = col) as cols,
      lateral (select * from pg_attribute where attrelid = confrelid and attnum = ref) as refs
    ) as column_info,
    lateral (select * from pg_namespace where pg_namespace.oid = connamespace) as ns1,
    lateral (select * from pg_class where pg_class.oid = conrelid) as tab,
    lateral (select * from pg_class where pg_class.oid = confrelid) as other,
    lateral (select * from pg_namespace where pg_namespace.oid = other.relnamespace) as ns2
    where confrelid != 0
    order by (conrelid, column_info.nums)
),

view_table_relations as (
        select  
                rel_cols.constraint_name,
                sc.view_schema as table_schema,
                sc.view_name   as table_name,
                sc.view_oid    as table_oid,
                array_agg(sc.view_column_name order by sc.view_oid, tt.ord) as columns,
                rel_cols.foreign_table_schema,
                rel_cols.foreign_table_name,
                rel_cols.foreign_table_oid,
                rel_cols.foreign_columns
        from table_table_relations rel_cols
        join view_source_columns sc
            on sc.table_oid = rel_cols.table_oid and sc.table_column_name = any(rel_cols.columns)
        join unnest(rel_cols.columns) with ordinality tt(cname, ord)
            on tt.cname = sc.table_column_name
        group by
            rel_cols.constraint_name,
            sc.view_schema,
            sc.view_name,
            sc.view_oid,
            rel_cols.foreign_table_schema,
            rel_cols.foreign_table_name,
            rel_cols.foreign_table_oid,
            rel_cols.foreign_columns
),

table_view_relations as (
        select  
                rel_cols.constraint_name,
                rel_cols.table_schema,
                rel_cols.table_name,
                rel_cols.table_oid,
                rel_cols.columns,
                sc.view_schema as foreign_table_schema,
                sc.view_name   as foreign_table_name,
                sc.view_oid    as foreign_table_oid,
                array_agg(sc.view_column_name order by sc.view_oid, tt.ord) as foreign_columns
        from table_table_relations rel_cols
        join view_source_columns sc
            on sc.table_oid = rel_cols.foreign_table_oid and sc.table_column_name = any(rel_cols.foreign_columns)
        join unnest(rel_cols.foreign_columns) with ordinality tt(cname, ord)
            on tt.cname = sc.table_column_name
        group by
            rel_cols.constraint_name,
            rel_cols.table_schema,
            rel_cols.table_name,
            rel_cols.table_oid,
            rel_cols.columns,
            sc.view_schema,
            sc.view_name,
            sc.view_oid
),

view_view_relations as (
    select
        left_view.constraint_name,
        left_view.table_schema,
        left_view.table_name,
        left_view.table_oid,
        left_view.columns,
        right_view.foreign_table_schema,
        right_view.foreign_table_name,
        right_view.foreign_table_oid,
        right_view.foreign_columns
    from view_table_relations left_view
    join table_view_relations right_view on
    left_view.constraint_name = right_view.constraint_name
    --and left_view.foreign_table_oid = right_view.table_oid
),

custom_relations as (
  select
    constraint_name,
    table_schema,
    table_name,
    0 as table_oid,
    columns,
    foreign_table_schema,
    foreign_table_name,
    0 as foreign_table_oid,
    foreign_columns   
  from json_to_recordset('{@relations.json#[]}'::json)
  as x(
    constraint_name text,
    table_schema text,
    table_name text,
    columns text[],
    foreign_table_schema text,
    foreign_table_name text,
    foreign_columns text[]
  )
),

relations as (
    select * from custom_relations
    union
    select * from table_table_relations
    union
    select * from view_table_relations
    union
    select * from table_view_relations
    union
    select * from view_view_relations
),

permissions as (
    select
      name,
      restrictive,
      table_schema,
      table_name,
      role,
      "grant",
      columns,
      policy_for,
      "check",
      "using"
    from json_to_recordset('{@permissions.json#[]}'::json)
    as x(
      name text,
      restrictive boolean,
      table_schema text,
      table_name text,
      role text,
      "grant" text[],
      columns text[],
      policy_for text[],
      "check" json,
      "using" json
    )
),

json_schema as (
  select 
      json_build_object (
          'use_internal_permissions', (select count(*) from permissions) > 0,
          'schemas', coalesce(schemas_agg.array_agg, array[]::record[])
      )::text as json_schema
  from
    (
        select 
        array_agg(schemas_res)
        from (
            select 
                s.schema_name as name,
                coalesce((select json_agg(objects.v) from (
                    select json_build_object(

                        'name', t.table_name,
                        'kind', case t.relkind
                            when 'r' then 'table'
                            when 'v' then 'view'
                            when 'm' then 'view'
                            else 'table'
                        end,
                        'columns', coalesce((select json_agg(columns.*) from (
                            select
                                c.col_name as name,
                                c.col_is_primary_key as primary_key,
                                c.col_type as data_type
                            from columns c
                            where c.col_table_oid= t.table_oid
                        ) as columns), '[]'),
                        'foreign_keys', coalesce((select json_agg(foreign_keys.*) from (
                            select
                                r.constraint_name as name,
                                array[r.table_schema, r.table_name] as "table",
                                r.columns,
                                array[r.foreign_table_schema, r.foreign_table_name] as referenced_table,
                                r.foreign_columns as referenced_columns
                            from relations r
                            where 
                            r.table_schema= t.table_schema
                            and r.table_name= t.table_name
                            and r.table_schema = any($1)
                            and r.foreign_table_schema = any($1)
                        ) as foreign_keys), '[]'),
                        'permissions', coalesce((select json_agg(permissions.*) from (
                            select
                                p.name,
                                coalesce(p.restrictive,false) as restrictive,
                                p.role,
                                p.grant,
                                p.columns,
                                p.policy_for,
                                p.check,
                                p.using
                            from permissions p
                            where 
                            p.table_schema= t.table_schema
                            and p.table_name= t.table_name
                            --and p.table_schema = any($1)
                        ) as permissions), '[]')
                    ) as v
                    from tables t
                    where t.schema_oid = s.schema_oid

                    union all

                    select json_build_object(
                        'name', f.function_name,
                        'kind', 'function',
                        'parameters', f.parameters,
                        'return_type_schema', f.return_type_schema,
                        'return_type', f.return_type,
                        'setof', f.setof,
                        'composite', f.composite,
                        'volatile', f.volatile,
                        'variadic', f.variadic,
                        'foreign_keys', coalesce((select json_agg(foreign_keys.*) from (
                            select
                                r.constraint_name as name,
                                array[r.table_schema, r.table_name] as "table",
                                r.columns,
                                array[r.foreign_table_schema, r.foreign_table_name] as referenced_table,
                                r.foreign_columns as referenced_columns
                            from relations r
                            where 
                            r.table_oid= f.return_type_oid
                            and r.table_schema = any($1)
                            and r.foreign_table_schema = any($1)
                        ) as foreign_keys), '[]')
                    ) as v
                    from functions f
                    where f.function_schema_oid = s.schema_oid
                ) as objects), '[]') as objects
            from schemas s
        ) schemas_res
    ) schemas_agg
)

select json_schema from json_schema
