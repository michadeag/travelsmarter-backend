#!/bin/bash
# Social Media Automation - Database Migration Script

echo "🔄 Starting Social Media database migrations..."
echo ""

# Run the migration
node migrations/runMigrations.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All migrations completed successfully!"
    echo ""
    echo "Database tables created:"
    echo "  - social_media_accounts"
    echo "  - social_media_posts"
    echo "  - post_platforms"
    echo "  - scheduled_posts"
    echo "  - post_analytics"
    echo "  - social_media_config"
    echo ""
    echo "Next steps:"
    echo "  1. Fix Twitter app (Web App type, not Native)"
    echo "  2. Get Twitter credentials"
    echo "  3. Test posting in the dashboard"
else
    echo ""
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
