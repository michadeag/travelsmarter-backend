/**
 * Migration Runner
 * Executes all migrations in order
 */

const migration001 = require('./001_create_social_media_tables');

const migrations = [
  { name: '001_create_social_media_tables', ...migration001 }
];

async function runMigrations() {
  console.log('\n🚀 Starting migrations...\n');

  for (const migration of migrations) {
    try {
      await migration.up();
      console.log(`✅ ${migration.name} completed\n`);
    } catch (error) {
      console.error(`❌ ${migration.name} failed:`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log('✅ All migrations completed successfully!');
  process.exit(0);
}

async function rollbackMigrations() {
  console.log('\n⚠️ Rolling back all migrations...\n');

  // Reverse order
  for (let i = migrations.length - 1; i >= 0; i--) {
    const migration = migrations[i];
    try {
      await migration.down();
      console.log(`✅ ${migration.name} rolled back\n`);
    } catch (error) {
      console.error(`❌ ${migration.name} rollback failed:`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log('✅ All migrations rolled back!');
  process.exit(0);
}

// Check command line arguments
const command = process.argv[2];

if (command === 'rollback') {
  rollbackMigrations();
} else {
  runMigrations();
}
