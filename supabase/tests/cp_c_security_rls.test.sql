-- CP-C direct RLS and protection tests.
-- All fixtures and mutations are transaction-only; the final ROLLBACK is mandatory.

begin;

-- Fixed role identities.
insert into public.roles (id, key, name, kind) values
  ('10000000-0000-0000-0000-000000000001', 'owner', 'Owner', 'system'),
  ('10000000-0000-0000-0000-000000000002', 'admin', 'Admin', 'system'),
  ('10000000-0000-0000-0000-000000000003', 'content-editor', 'Content', 'system'),
  ('10000000-0000-0000-0000-000000000004', 'course-manager', 'Courses', 'system'),
  ('10000000-0000-0000-0000-000000000005', 'finance', 'Finance', 'system'),
  ('10000000-0000-0000-0000-000000000006', 'unauthorized', 'Unauthorized', 'custom'),
  ('10000000-0000-0000-0000-000000000007', 'course-editor', 'Course editor', 'custom'),
  ('10000000-0000-0000-0000-000000000008', 'course-publisher', 'Course publisher', 'custom'),
  ('10000000-0000-0000-0000-000000000009', 'users-manager', 'Users manager', 'custom'),
  ('10000000-0000-0000-0000-000000000010', 'roles-manager', 'Roles manager', 'custom'),
  ('10000000-0000-0000-0000-000000000011', 'custom-target', 'Custom target', 'custom'),
  ('10000000-0000-0000-0000-000000000012', 'unused-custom', 'Unused custom', 'custom');

-- Test-only catalog subset. CP-D owns the production catalog seed.
insert into public.permissions (module, action) values
  ('courses', 'view'), ('courses', 'create'), ('courses', 'edit'),
  ('courses', 'delete'), ('courses', 'publish'),
  ('blog', 'view'), ('blog', 'create'), ('blog', 'edit'),
  ('blog', 'delete'), ('blog', 'publish'),
  ('homepage', 'view'), ('homepage', 'edit'),
  ('payments', 'view'), ('payments', 'manage'),
  ('users', 'view'), ('users', 'create'), ('users', 'edit'), ('users', 'delete'),
  ('roles', 'view'), ('roles', 'create'), ('roles', 'edit'), ('roles', 'delete'),
  ('trainers', 'view'), ('trainers', 'create'), ('trainers', 'edit'), ('trainers', 'delete'),
  ('corporate-requests', 'view'), ('corporate-requests', 'edit'),
  ('corporate-requests', 'manage');

-- Owner-like: all catalog permissions in this transaction.
insert into public.role_permissions (role_id, module, action)
select '10000000-0000-0000-0000-000000000001', module, action
from public.permissions;

-- Admin-like is deliberately granted roles.delete to prove the DB system-role
-- guard remains authoritative even when RLS authorization succeeds.
insert into public.role_permissions (role_id, module, action) values
  ('10000000-0000-0000-0000-000000000002', 'roles', 'delete'),
  ('10000000-0000-0000-0000-000000000003', 'blog', 'create'),
  ('10000000-0000-0000-0000-000000000003', 'blog', 'edit'),
  ('10000000-0000-0000-0000-000000000003', 'blog', 'publish'),
  ('10000000-0000-0000-0000-000000000003', 'homepage', 'edit'),
  ('10000000-0000-0000-0000-000000000004', 'courses', 'create'),
  ('10000000-0000-0000-0000-000000000004', 'courses', 'edit'),
  ('10000000-0000-0000-0000-000000000004', 'courses', 'delete'),
  ('10000000-0000-0000-0000-000000000004', 'courses', 'publish'),
  ('10000000-0000-0000-0000-000000000005', 'payments', 'manage'),
  ('10000000-0000-0000-0000-000000000005', 'corporate-requests', 'view'),
  ('10000000-0000-0000-0000-000000000007', 'courses', 'edit'),
  ('10000000-0000-0000-0000-000000000008', 'courses', 'edit'),
  ('10000000-0000-0000-0000-000000000008', 'courses', 'publish'),
  ('10000000-0000-0000-0000-000000000009', 'users', 'create'),
  ('10000000-0000-0000-0000-000000000009', 'users', 'edit'),
  ('10000000-0000-0000-0000-000000000009', 'users', 'delete'),
  ('10000000-0000-0000-0000-000000000010', 'roles', 'create'),
  ('10000000-0000-0000-0000-000000000010', 'roles', 'edit'),
  ('10000000-0000-0000-0000-000000000010', 'roles', 'delete'),
  ('10000000-0000-0000-0000-000000000010', 'blog', 'edit');

insert into public.profiles (id, name, role_id, status) values
  ('20000000-0000-0000-0000-000000000001', 'Owner user', '10000000-0000-0000-0000-000000000001', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Admin user', '10000000-0000-0000-0000-000000000002', 'active'),
  ('20000000-0000-0000-0000-000000000003', 'Content user', '10000000-0000-0000-0000-000000000003', 'active'),
  ('20000000-0000-0000-0000-000000000004', 'Course user', '10000000-0000-0000-0000-000000000004', 'active'),
  ('20000000-0000-0000-0000-000000000005', 'Finance user', '10000000-0000-0000-0000-000000000005', 'active'),
  ('20000000-0000-0000-0000-000000000006', 'Unauthorized user', '10000000-0000-0000-0000-000000000006', 'active'),
  ('20000000-0000-0000-0000-000000000007', 'Edit user', '10000000-0000-0000-0000-000000000007', 'active'),
  ('20000000-0000-0000-0000-000000000008', 'Publish user', '10000000-0000-0000-0000-000000000008', 'active'),
  ('20000000-0000-0000-0000-000000000009', 'Users manager', '10000000-0000-0000-0000-000000000009', 'active'),
  ('20000000-0000-0000-0000-000000000010', 'Roles manager', '10000000-0000-0000-0000-000000000010', 'active');

insert into public.trainers (id, name, title, specialty) values
  ('30000000-0000-0000-0000-000000000001', 'Trainer', 'Trainer', 'Photography');

insert into public.courses
  (id, slug, name, category, trainer_id, publish_status)
values
  ('40000000-0000-0000-0000-000000000001', 'published-course', 'Published course', 'online', '30000000-0000-0000-0000-000000000001', 'published'),
  ('40000000-0000-0000-0000-000000000002', 'draft-course', 'Draft course', 'online', '30000000-0000-0000-0000-000000000001', 'draft');

insert into public.blog_posts (id, slug, title, author_id, publish_status) values
  ('50000000-0000-0000-0000-000000000001', 'published-blog', 'Published blog', '20000000-0000-0000-0000-000000000003', 'published'),
  ('50000000-0000-0000-0000-000000000002', 'draft-blog', 'Draft blog', '20000000-0000-0000-0000-000000000003', 'draft');

insert into public.testimonials (id, name, review, rating, visible) values
  ('60000000-0000-0000-0000-000000000001', 'Visible', 'Visible review', 5, true),
  ('60000000-0000-0000-0000-000000000002', 'Hidden', 'Hidden review', 5, false);

insert into public.payment_settings (id, provider) values
  ('70000000-0000-0000-0000-000000000001', 'moyasar');
insert into public.homepage_hero (id, title) values (1, 'Initial hero');

-- ANON: exact public projection and the single safe write.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare n integer;
begin
  select count(*) into n from public.courses;
  if n <> 1 then raise exception 'ANON published course projection failed'; end if;
  select count(*) into n from public.courses where slug = 'draft-course';
  if n <> 0 then raise exception 'ANON draft course leaked'; end if;
  select count(*) into n from public.blog_posts;
  if n <> 1 then raise exception 'ANON published blog projection failed'; end if;
  select count(*) into n from public.blog_posts where slug = 'draft-blog';
  if n <> 0 then raise exception 'ANON draft blog leaked'; end if;
  select count(*) into n from public.testimonials;
  if n <> 1 then raise exception 'ANON visible testimonial projection failed'; end if;
  select count(*) into n from public.testimonials where visible = false;
  if n <> 0 then raise exception 'ANON hidden testimonial leaked'; end if;

  begin
    perform count(*) from public.corporate_requests;
    raise exception 'EXPECTED_FAILURE: anon corporate SELECT';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.courses (slug, name, category, trainer_id)
    values ('anon-course', 'Anon course', 'online', '30000000-0000-0000-0000-000000000001');
    raise exception 'EXPECTED_FAILURE: anon course INSERT';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.courses set name = 'Anon update';
    raise exception 'EXPECTED_FAILURE: anon course UPDATE';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.courses;
    raise exception 'EXPECTED_FAILURE: anon course DELETE';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.profiles;
    raise exception 'EXPECTED_FAILURE: anon profile SELECT';
  exception when insufficient_privilege then null;
  end;
end;
$$;

insert into public.corporate_requests
  (id, company_name, contact_name, phone, email)
values
  ('80000000-0000-0000-0000-000000000001', 'Valid public lead', 'Contact', '1', 'lead@example.test');

do $$
begin
  begin
    insert into public.corporate_requests
      (company_name, contact_name, status)
    values ('Invalid status', 'Contact', 'contacted');
    raise exception 'EXPECTED_FAILURE: invalid corporate status';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.corporate_requests
      (company_name, contact_name, assigned_to)
    values ('Assigned public lead', 'Contact', '20000000-0000-0000-0000-000000000001');
    raise exception 'EXPECTED_FAILURE: assigned public lead';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- COURSE MANAGER: positive course operations; users remain inaccessible.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
insert into public.courses
  (id, slug, name, category, trainer_id, publish_status)
values
  ('40000000-0000-0000-0000-000000000003', 'manager-course', 'Manager course', 'online', '30000000-0000-0000-0000-000000000001', 'draft');
update public.courses set name = 'Manager updated' where id = '40000000-0000-0000-0000-000000000003';
delete from public.courses where id = '40000000-0000-0000-0000-000000000003';
do $$
declare before_name text;
begin
  select name into before_name from public.profiles where id = '20000000-0000-0000-0000-000000000006';
  update public.profiles set name = 'Forbidden user edit' where id = '20000000-0000-0000-0000-000000000006';
  if found then raise exception 'Course manager modified profiles'; end if;
end;
$$;
reset role;

-- CONTENT EDITOR: blog/homepage positive, payment negative.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
update public.blog_posts set title = 'Content edit' where id = '50000000-0000-0000-0000-000000000002';
update public.homepage_hero set title = 'Content hero' where id = 1;
do $$
begin
  update public.payment_settings set enabled = true;
  if found then raise exception 'Content editor modified payment settings'; end if;
end;
$$;
reset role;

-- FINANCE: payment positive, course negative.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
update public.payment_settings set enabled = true where provider = 'moyasar';
do $$
begin
  update public.courses set name = 'Finance course edit';
  if found then raise exception 'Finance modified a course'; end if;
end;
$$;
reset role;

-- UNAUTHORIZED authenticated: only public rows, no administrative mutation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true);
do $$
declare n integer;
begin
  select count(*) into n from public.courses;
  if n <> 1 then raise exception 'Unauthorized public projection mismatch'; end if;
  update public.role_permissions set action = action;
  if found then raise exception 'Unauthorized role_permissions update succeeded'; end if;
end;
$$;
reset role;

-- Publishing transition: edit alone edits content but cannot publish; publish
-- permission allows both directions.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000007', true);
update public.courses set name = 'Edit-only title' where id = '40000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    update public.courses set publish_status = 'published'
    where id = '40000000-0000-0000-0000-000000000002';
    raise exception 'EXPECTED_FAILURE: edit-only publish transition';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000008', true);
update public.courses set publish_status = 'published'
where id = '40000000-0000-0000-0000-000000000002';
update public.courses set publish_status = 'draft'
where id = '40000000-0000-0000-0000-000000000002';
reset role;

-- Users manager: ordinary other-user update works; self role escalation and
-- assigning the owner role are blocked.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000009', true);
update public.profiles set name = 'Managed user'
where id = '20000000-0000-0000-0000-000000000006';
do $$
begin
  begin
    update public.profiles
    set role_id = '10000000-0000-0000-0000-000000000001'
    where id = '20000000-0000-0000-0000-000000000009';
    raise exception 'EXPECTED_FAILURE: self role escalation';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles
    set role_id = '10000000-0000-0000-0000-000000000001'
    where id = '20000000-0000-0000-0000-000000000006';
    raise exception 'EXPECTED_FAILURE: assigning superior role';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Roles manager: custom matrix update succeeds and normalizes view; arbitrary
-- permission catalog mutation and system-role deletion fail.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000010', true);
insert into public.role_permissions (role_id, module, action)
values ('10000000-0000-0000-0000-000000000011', 'blog', 'edit');
do $$
declare n integer;
begin
  select count(*) into n
  from public.role_permissions
  where role_id = '10000000-0000-0000-0000-000000000011'
    and module = 'blog' and action in ('view', 'edit');
  if n <> 2 then raise exception 'DB view normalization failed'; end if;
  begin
    delete from public.role_permissions
    where role_id = '10000000-0000-0000-0000-000000000011'
      and module = 'blog' and action = 'view';
    raise exception 'EXPECTED_FAILURE: remove required view';
  exception when check_violation then null;
  end;
  begin
    insert into public.permissions (module, action) values ('media', 'manage');
    raise exception 'EXPECTED_FAILURE: mutate permission catalog';
  exception when insufficient_privilege then null;
  end;
end;
$$;
delete from public.roles where id = '10000000-0000-0000-0000-000000000012';
reset role;

-- Admin-like caller has an RLS delete permission but still cannot delete a
-- system role because the protection trigger is authoritative.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $$
begin
  begin
    delete from public.roles where key = 'finance';
    raise exception 'EXPECTED_FAILURE: delete system role';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Last owner cannot be deleted, suspended, or reassigned; owner permissions
-- cannot be reduced.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    delete from public.profiles where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'EXPECTED_FAILURE: last owner delete';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set status = 'suspended'
    where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'EXPECTED_FAILURE: last owner suspend';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    update public.profiles set role_id = '10000000-0000-0000-0000-000000000002'
    where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'EXPECTED_FAILURE: last owner role change';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    delete from public.role_permissions
    where role_id = '10000000-0000-0000-0000-000000000001'
      and module = 'courses' and action = 'view';
    raise exception 'EXPECTED_FAILURE: owner matrix reduction';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Fixture cleanup proof: rollback leaves the pre-test database empty.
rollback;
