/**
 * Hack Update Service
 * Orchestrates the entire process: scrape, parse, deduplicate, update database
 */

const pool = require('../config/database');
const hackScraperService = require('./hackScraperService');
const hackParserService = require('./hackParserService');
const { v4: uuidv4 } = require('uuid');

/**
 * Main function: Run complete hack update cycle
 */
async function runHackUpdateCycle() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting automated hack update cycle...');
  console.log('='.repeat(60) + '\n');

  const startTime = Date.now();
  const log = {
    started_at: new Date(),
    stage: 'initializing',
    new_hacks_added: 0,
    hacks_updated: 0,
    hacks_marked_obsolete: 0,
    duplicates_skipped: 0,
    errors: []
  };

  try {
    // Stage 1: Scrape web for new hacks
    log.stage = 'scraping';
    console.log('\n📡 STAGE 1: Web Scraping');
    console.log('-'.repeat(40));
    const rawHacks = await hackScraperService.searchForNewHacks();

    if (rawHacks.length === 0) {
      console.log('⚠️ No hacks found during scraping');
      log.errors.push('No hacks found during web scraping');
      await logUpdateCycle(log);
      return log;
    }

    // Stage 2: Parse hacks with AI
    log.stage = 'parsing';
    console.log('\n🤖 STAGE 2: AI Parsing');
    console.log('-'.repeat(40));
    const parsedHacks = await hackParserService.parseMultipleHacks(rawHacks);

    if (parsedHacks.length === 0) {
      console.log('⚠️ No valid hacks parsed');
      log.errors.push('No valid hacks parsed from scraped content');
      await logUpdateCycle(log);
      return log;
    }

    // Stage 3: Get existing hacks
    log.stage = 'deduplication';
    console.log('\n🔄 STAGE 3: Deduplication');
    console.log('-'.repeat(40));
    const existingHacks = await getExistingHacks();
    const deduplicationResults = hackParserService.deduplicateHacks(
      parsedHacks,
      existingHacks
    );

    // Stage 4: Update database
    log.stage = 'database_update';
    console.log('\n💾 STAGE 4: Database Update');
    console.log('-'.repeat(40));

    // Add new hacks
    for (const hack of deduplicationResults.new) {
      try {
        await addNewHack(hack);
        log.new_hacks_added++;
      } catch (error) {
        console.error(`❌ Failed to add hack "${hack.title}":`, error.message);
        log.errors.push(`Failed to add hack: ${hack.title}`);
      }
    }

    // Update existing hacks
    for (const update of deduplicationResults.updated) {
      try {
        await updateExistingHack(update.existing.id, update.new);
        log.hacks_updated++;
      } catch (error) {
        console.error(`❌ Failed to update hack:`, error.message);
        log.errors.push(`Failed to update hack: ${update.new.title}`);
      }
    }

    // Log duplicates
    log.duplicates_skipped = deduplicationResults.duplicates.length;

    // Stage 5: Check for obsolete hacks
    log.stage = 'obsolescence_check';
    console.log('\n🔎 STAGE 5: Obsolescence Check');
    console.log('-'.repeat(40));
    const obsoleteCount = await markObsoleteHacks();
    log.hacks_marked_obsolete = obsoleteCount;

    // Finalize
    log.stage = 'completed';
    log.completed_at = new Date();
    log.duration_seconds = Math.round((Date.now() - startTime) / 1000);

    // Log the update
    await logUpdateCycle(log);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ HACK UPDATE CYCLE COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   ➕ New hacks added: ${log.new_hacks_added}`);
    console.log(`   ✏️  Hacks updated: ${log.hacks_updated}`);
    console.log(`   🗑️  Hacks marked obsolete: ${log.hacks_marked_obsolete}`);
    console.log(`   ⏭️  Duplicates skipped: ${log.duplicates_skipped}`);
    console.log(`   ⏱️  Duration: ${log.duration_seconds}s`);
    if (log.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${log.errors.length}`);
    }
    console.log('='.repeat(60) + '\n');

    return log;
  } catch (error) {
    console.error('\n❌ FATAL ERROR in hack update cycle:', error);
    log.stage = 'failed';
    log.completed_at = new Date();
    log.errors.push(`Fatal error: ${error.message}`);
    await logUpdateCycle(log);
    return log;
  }
}

/**
 * Get all existing active hacks from database
 */
async function getExistingHacks() {
  try {
    const result = await pool.query(
      'SELECT id, module_id, title, description, category, difficulty FROM hacks WHERE is_active = true'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching existing hacks:', error);
    return [];
  }
}

/**
 * Add new hack to database
 */
async function addNewHack(hack) {
  const hackId = uuidv4();

  await pool.query(
    `INSERT INTO hacks (id, module_id, title, description, category, difficulty, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
    [
      hackId,
      hack.module_id,
      hack.title,
      hack.description,
      hack.category,
      hack.difficulty
    ]
  );

  console.log(`✅ Added new hack: "${hack.title}"`);
  return hackId;
}

/**
 * Update existing hack
 */
async function updateExistingHack(hackId, newData) {
  await pool.query(
    `UPDATE hacks
     SET title = $1, description = $2, category = $3, difficulty = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [
      newData.title,
      newData.description,
      newData.category,
      newData.difficulty,
      hackId
    ]
  );

  console.log(`✏️  Updated hack: "${newData.title}"`);
}

/**
 * Mark hacks as obsolete based on patterns
 */
async function markObsoleteHacks() {
  try {
    // Mark hacks with very low engagement or old creation dates as potentially obsolete
    // This is a simple heuristic - in production, you'd have more sophisticated logic
    const result = await pool.query(
      `UPDATE hacks
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE created_at < NOW() - INTERVAL '1 year'
       AND (SELECT COUNT(*) FROM saved_hacks WHERE hack_id = hacks.id) < 5
       AND is_active = true
       RETURNING id`
    );

    console.log(`🗑️  Marked ${result.rows.length} hacks as obsolete`);
    return result.rows.length;
  } catch (error) {
    console.error('Error marking obsolete hacks:', error);
    return 0;
  }
}

/**
 * Log the update cycle to database
 */
async function logUpdateCycle(log) {
  try {
    await pool.query(
      `INSERT INTO hack_update_logs (stage, new_hacks_added, hacks_updated, hacks_marked_obsolete, duplicates_skipped, errors, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        log.stage,
        log.new_hacks_added,
        log.hacks_updated,
        log.hacks_marked_obsolete,
        log.duplicates_skipped,
        JSON.stringify(log.errors),
        log.started_at,
        log.completed_at || new Date()
      ]
    );
  } catch (error) {
    console.error('Error logging update cycle:', error);
  }
}

/**
 * Get recent update logs
 */
async function getUpdateLogs(limit = 20) {
  try {
    const result = await pool.query(
      `SELECT * FROM hack_update_logs ORDER BY started_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching update logs:', error);
    return [];
  }
}

module.exports = {
  runHackUpdateCycle,
  getExistingHacks,
  addNewHack,
  updateExistingHack,
  markObsoleteHacks,
  logUpdateCycle,
  getUpdateLogs
};
