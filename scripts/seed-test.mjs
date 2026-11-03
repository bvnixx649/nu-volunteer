// Resets the test data on the real Supabase project to what supabase/seed-test.sql produces. Orgs are never touched.
//   node scripts/seed-test.mjs           reset
//   node scripts/seed-test.mjs --clean   remove the test data
import { seedTestData } from './lib/seed.mjs'

console.log(await seedTestData({ clean: process.argv.includes('--clean') }))
