-- Run ONCE after creating your user in Dashboard > Authentication > Users > Add user
-- (tick "Auto Confirm User"). Replace the email, then run in the SQL Editor.
insert into public.admins (user_id)
select id from auth.users where email = 'chernet.tariku12@gmail.com';
