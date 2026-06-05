const pool = require('../config/database');

// @desc Save a hack
// @route POST /api/hacks/save
// @access Private
exports.saveHack = async (req, res) => {
  try {
    const { moduleId, hackId, hackTitle, hackCategory } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!moduleId || !hackId || !hackTitle) {
      return res.status(400).json({
        success: false,
        message: 'Please provide moduleId, hackId, and hackTitle',
      });
    }

    // Check if already saved
    const existingSave = await pool.query(
      `SELECT id FROM saved_hacks
       WHERE user_id = $1 AND module_id = $2 AND hack_id = $3`,
      [userId, moduleId, hackId]
    );

    if (existingSave.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hack already saved',
      });
    }

    // Save hack
    const result = await pool.query(
      `INSERT INTO saved_hacks (user_id, module_id, hack_id, hack_title, hack_category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, moduleId, hackId, hackTitle, hackCategory]
    );

    res.status(201).json({
      success: true,
      message: 'Hack saved successfully',
      savedHack: result.rows[0],
    });
  } catch (error) {
    console.error('Save hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving hack',
      error: error.message,
    });
  }
};

// @desc Remove saved hack
// @route DELETE /api/hacks/:hackId/remove
// @access Private
exports.removeHack = async (req, res) => {
  try {
    const { hackId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM saved_hacks
       WHERE user_id = $1 AND hack_id = $2
       RETURNING id`,
      [userId, hackId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Saved hack not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hack removed from saved',
    });
  } catch (error) {
    console.error('Remove hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing hack',
      error: error.message,
    });
  }
};

// @desc Get user's saved hacks
// @route GET /api/hacks/saved
// @access Private
exports.getSavedHacks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { moduleId, category } = req.query;

    let query = `
      SELECT id, module_id, hack_id, hack_title, hack_category, saved_at
      FROM saved_hacks
      WHERE user_id = $1
    `;
    const params = [userId];

    if (moduleId) {
      query += ` AND module_id = $${params.length + 1}`;
      params.push(parseInt(moduleId));
    }

    if (category) {
      query += ` AND hack_category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY saved_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      savedHacks: result.rows,
    });
  } catch (error) {
    console.error('Get saved hacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved hacks',
      error: error.message,
    });
  }
};

// @desc Check if hack is saved
// @route GET /api/hacks/:hackId/is-saved
// @access Private
exports.isHackSaved = async (req, res) => {
  try {
    const { hackId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id FROM saved_hacks
       WHERE user_id = $1 AND hack_id = $2`,
      [userId, hackId]
    );

    res.status(200).json({
      success: true,
      isSaved: result.rows.length > 0,
    });
  } catch (error) {
    console.error('Check saved hack error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking saved status',
      error: error.message,
    });
  }
};

// @desc Get hacks by module
// @route GET /api/hacks/module/:moduleId
// @access Public
exports.getHacksByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // This would return hacks from your static hack database
    // For now, this is a placeholder that would connect to your hack data
    const hackData = {
      1: { module: 'Flight Hacks', hackCount: 6 },
      2: { module: 'Credit Cards', hackCount: 7 },
      3: { module: 'Hotel Hacks', hackCount: 7 },
      4: { module: 'Timing Intelligence', hackCount: 6 },
      5: { module: 'Airport & Transit', hackCount: 6 },
      6: { module: 'Destinations', hackCount: 4 },
      7: { module: 'Car Rentals', hackCount: 4 },
      8: { module: 'Community', hackCount: 7 },
      9: { module: 'Travel Money', hackCount: 5 },
      10: { module: 'Travel Insurance', hackCount: 5 },
      11: { module: 'Visa & Immigration', hackCount: 5 },
      12: { module: 'Accommodations', hackCount: 5 },
      13: { module: 'Ground Transport', hackCount: 5 },
      14: { module: 'Travel Bookings', hackCount: 5 },
      15: { module: 'Food & Dining', hackCount: 5 },
      16: { module: 'Shopping & VAT', hackCount: 5 },
    };

    if (!hackData[moduleId]) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }

    res.status(200).json({
      success: true,
      module: hackData[moduleId],
      message: 'To get detailed hacks, refer to the web application content',
    });
  } catch (error) {
    console.error('Get hacks by module error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hacks',
      error: error.message,
    });
  }
};

// @desc Get all modules
// @route GET /api/hacks/modules
// @access Public
exports.getAllModules = async (req, res) => {
  try {
    const modules = [
      { id: 1, title: 'Flight Hacks', icon: '✈️', hackCount: 6 },
      { id: 2, title: 'Credit Cards', icon: '💳', hackCount: 7 },
      { id: 3, title: 'Hotel Hacks', icon: '🏨', hackCount: 7 },
      { id: 4, title: 'Timing Intelligence', icon: '⏰', hackCount: 6 },
      { id: 5, title: 'Airport & Transit', icon: '✈️', hackCount: 6 },
      { id: 6, title: 'Destinations', icon: '🌍', hackCount: 4 },
      { id: 7, title: 'Car Rentals', icon: '🚗', hackCount: 4 },
      { id: 8, title: 'Community', icon: '👥', hackCount: 7 },
      { id: 9, title: 'Travel Money', icon: '💰', hackCount: 5 },
      { id: 10, title: 'Travel Insurance', icon: '🛡️', hackCount: 5 },
      { id: 11, title: 'Visa & Immigration', icon: '🛂', hackCount: 5 },
      { id: 12, title: 'Accommodations', icon: '🏠', hackCount: 5 },
      { id: 13, title: 'Ground Transport', icon: '🚆', hackCount: 5 },
      { id: 14, title: 'Travel Bookings', icon: '🔍', hackCount: 5 },
      { id: 15, title: 'Food & Dining', icon: '🍽️', hackCount: 5 },
      { id: 16, title: 'Shopping & VAT', icon: '🛍️', hackCount: 5 },
    ];

    res.status(200).json({
      success: true,
      totalModules: modules.length,
      totalHacks: modules.reduce((sum, m) => sum + m.hackCount, 0),
      modules: modules,
    });
  } catch (error) {
    console.error('Get all modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching modules',
      error: error.message,
    });
  }
};
