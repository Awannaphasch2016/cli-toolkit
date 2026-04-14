# manage-cli

Simple CLI management for OpenCLI registry. Track and reinstall your curated set of CLIs across servers.

## Installation

```bash
# Register with OpenCLI
opencli register ~/dev/cli-toolkit/manage-cli/manage-launcher.js
```

## Usage

### Add CLI to Registry
```bash
# Add a CLI to the registry and register with opencli
manage-cli add opencli blog ~/dev/blog-cli/blog-launcher.js
manage-cli add opencli skills ~/dev/skills-toolkit/skills-launcher.js
```

### Remove CLI from Registry
```bash
# Remove CLI from registry (note: may need manual opencli cleanup)
manage-cli delete opencli blog
```

### List Registered CLIs
```bash
# View all CLIs in registry
manage-cli list opencli

# JSON output
manage-cli list opencli --json
```

### Install All CLIs
```bash
# Install all CLIs from registry (for new servers)
manage-cli install opencli --all
```

## Workflow

### Development Machine
```bash
# Build up your CLI registry
manage-cli add opencli blog ~/dev/blog-cli/blog-launcher.js
manage-cli add opencli skills ~/dev/skills-toolkit/skills-launcher.js
manage-cli add opencli demand ~/dev/demand-cli/demand-launcher.js

# Check your registry
manage-cli list opencli
```

### New Server Setup
```bash
# Clone cli-toolkit (contains manage-cli and registry)
git clone https://github.com/Awannaphasch2016/cli-toolkit
cd cli-toolkit

# Register manage-cli
opencli register ./manage-cli/manage-launcher.js

# Install all your CLIs
manage-cli install opencli --all

# All CLIs now available
opencli blog
opencli skills
opencli demand
```

## Registry Structure

The registry is stored in `registry.json`:

```json
{
  "version": "1.0.0",
  "opencli": {
    "blog": {
      "path": "~/dev/blog-cli/blog-launcher.js",
      "repo": "https://github.com/Awannaphasch2016/blog-cli",
      "description": "Blog content management CLI"
    },
    "skills": {
      "path": "~/dev/skills-toolkit/skills-launcher.js",
      "repo": "https://github.com/Awannaphasch2016/skills-toolkit",
      "description": "Skills management CLI"
    }
  }
}
```

## Features

- **Simple**: Just 4 commands (add, delete, list, install)
- **Git Integration**: Auto-detects git repositories and clones on install
- **JSON Support**: All commands support `--json` output
- **OpenCLI Native**: Integrates directly with OpenCLI registration
- **Cross-Server**: Easy CLI synchronization across machines

## Benefits

- **Curated Collection**: Track only your important CLIs
- **Easy Setup**: One command installs everything on new servers
- **Version Control**: Registry is tracked in git
- **Flexibility**: Add/remove individual CLIs as needed