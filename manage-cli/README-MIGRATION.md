# CLI Management Migration Guide

This guide walks you through migrating from file-based CLI management (`registry.json`) to a Supabase database system.

## 🚀 Quick Start

1. **Setup environment:**
   ```bash
   npm run setup
   ```

2. **Configure Supabase** (edit `.env` file):
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Deploy database schema** (in Supabase dashboard or CLI):
   ```sql
   -- Copy and run sql/schema.sql in your Supabase SQL editor
   ```

4. **Test the setup:**
   ```bash
   npm run test:migration
   ```

5. **Run migration:**
   ```bash
   npm run migrate
   ```

6. **Test database commands:**
   ```bash
   ./bin/manage.mjs list-db
   ```

## 📋 Available Commands

### Legacy Commands (File-based)
```bash
manage-cli add opencli <name> <path>     # Add CLI to registry.json
manage-cli delete opencli <name>         # Remove CLI from registry.json
manage-cli list opencli                  # List CLIs from registry.json
manage-cli install opencli --all         # Install CLIs from registry.json
```

### New Commands (Database)
```bash
manage-cli add-db <name> <path>          # Add CLI to database
manage-cli delete-db <name>              # Remove CLI from database
manage-cli list-db                       # List CLIs from database
manage-cli install-db --all              # Install CLIs from database
manage-cli migrate                       # Migrate from file to database
```

### Utility Commands
```bash
npm run setup                            # Setup environment
npm run migrate                          # Run migration
npm run rollback                         # Rollback to file-based
npm run test:migration                   # Test migration readiness
npm run test:database                    # Test database connection
```

## 🗄️ Database Schema

The new system uses a simplified schema:

```sql
-- Users (for multi-user support)
cli_simple.users (id, email, username, created_at, updated_at)

-- Managed CLIs
cli_simple.managed_clis (
  id,
  user_id,           -- References users.id
  name,              -- CLI name (e.g., 'blog', 'skills')
  install_type,      -- 'npx', 'skillport', 'git', 'local', 'opencli'
  install_command,   -- Full command to install
  description,       -- CLI description
  repository_url,    -- Git repo if applicable
  launcher_path,     -- Path to launcher file
  is_active,         -- Whether CLI is actively managed
  last_installed,    -- When CLI was last installed
  created_at,
  updated_at
)
```

## 📊 Migration Process

### What Gets Migrated

From `registry.json`:
```json
{
  "version": "1.0.0",
  "opencli": {
    "blog": {
      "path": "/home/user/blog-cli/blog-launcher.js",
      "repo": "https://github.com/user/blog-cli.git",
      "description": "Blog CLI tool"
    }
  }
}
```

To database:
```sql
INSERT INTO managed_clis (
  name: 'blog',
  install_type: 'git',
  install_command: 'git clone https://github.com/user/blog-cli.git',
  description: 'Blog CLI tool',
  repository_url: 'https://github.com/user/blog-cli.git',
  launcher_path: '/home/user/blog-cli/blog-launcher.js'
);
```

### Install Type Detection

| Original Data | Detected Type | Generated Command |
|---------------|---------------|-------------------|
| Git repo URL | `git` | `git clone <repo>` |
| OpenCLI path | `opencli` | `opencli register <path>` |
| Skill description | `skillport` | `skillport add <name>` |
| Local path | `local` | `echo "Local CLI at <path>"` |

## 🔄 Rollback Plan

If something goes wrong, you can rollback:

```bash
npm run rollback
```

This will:
1. Restore from `registry.json.backup` if available
2. Export current database state to `registry.json` if no backup
3. Restore file-based command functionality

## 🛠️ Troubleshooting

### Database Connection Issues

1. **Check credentials:**
   ```bash
   npm run test:database
   ```

2. **Verify .env file:**
   ```bash
   cat .env | grep SUPABASE
   ```

3. **Check schema deployment:**
   - Ensure `sql/schema.sql` was run in Supabase
   - Verify RLS policies are enabled

### Migration Failures

1. **Check test results:**
   ```bash
   npm run test:migration
   ```

2. **Verify backup exists:**
   ```bash
   ls -la registry.json.backup*
   ```

3. **Manual rollback:**
   ```bash
   cp registry.json.backup registry.json
   ```

### Permission Errors

1. **Check RLS policies in Supabase**
2. **Verify user creation in database:**
   ```sql
   SELECT * FROM cli_simple.users WHERE email = 'migration@local.dev';
   ```

## 📁 File Structure

```
manage-cli/
├── sql/
│   └── schema.sql                    # Database schema
├── src/
│   ├── commands/
│   │   ├── add-database.mjs         # Database add command
│   │   ├── list-database.mjs        # Database list command
│   │   ├── install-database.mjs     # Database install command
│   │   └── delete-database.mjs      # Database delete command
│   └── lib/
│       ├── database-manager.mjs     # Database operations
│       └── auth-manager.mjs         # User authentication
├── scripts/
│   ├── migrate-to-database.mjs      # Migration script
│   ├── rollback.mjs                 # Rollback script
│   └── setup.sh                     # Environment setup
├── test/
│   └── test-migration.mjs           # Migration tests
├── .env.example                     # Environment template
├── registry.json                    # Original registry (legacy)
└── registry.json.backup            # Backup created during migration
```

## 🎯 Benefits of Migration

### For Single Users
- ✅ **Cloud sync**: Access CLIs from multiple machines
- ✅ **Better tracking**: Installation history and status
- ✅ **Type safety**: Structured data vs free-form JSON

### For Teams (Future)
- ✅ **User isolation**: Each user has their own CLI collection
- ✅ **Sharing**: Public/private CLI registries
- ✅ **Collaboration**: Team-based CLI management

### For Developers
- ✅ **API access**: REST API for CLI operations
- ✅ **Real-time**: Live updates and synchronization
- ✅ **Analytics**: Usage tracking and metrics

## 🔐 Security

- **Row Level Security (RLS)**: Users can only access their own CLIs
- **Authentication**: Optional user accounts (defaults to migration user)
- **API Keys**: Supabase handles secure key management
- **Audit Trail**: All operations are logged with timestamps

## 📈 Performance

- **Indexed queries**: Fast CLI lookups by name, type, user
- **Caching**: Future support for Redis caching
- **Pagination**: Efficient handling of large CLI collections
- **Optimistic updates**: Fast UI updates with background sync

## 🆘 Support

If you need help:

1. **Run diagnostics:**
   ```bash
   npm run test:migration
   ```

2. **Check logs:**
   ```bash
   ./bin/manage.mjs list-db --json
   ```

3. **Emergency rollback:**
   ```bash
   npm run rollback
   ```

4. **Report issues:**
   - Include test results
   - Share error messages
   - Provide environment details