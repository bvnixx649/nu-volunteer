-- Removes what seed-test.sql added. Registrations and credits go with their activities.
delete from activities where id in ('test-blood', 'test-ended');
delete from orgs where code in ('NUVOL69', 'NUADMIN');
