# CLI Toolkit

Complete AI-powered CLI toolkit for content generation, marketing, and analysis. Install all 7 specialized CLI tools with one command using OpenCLI.

## 🚀 Quick Install

```bash
opencli install https://github.com/Awannaphasch2016/cli-toolkit
```

This will install all 7 CLI tools:

- **blog** - Publish markdown articles to Dev.to with Supabase snapshots
- **demand** - Generate audience psychology and buyer context
- **evaluate** - AI content evaluation and optimization framework
- **meta-ads** - Meta/Facebook/Instagram ad copy generation
- **optimize-prompt** - Intelligent prompt optimization system
- **spec** - Universal specification generator
- **supply** - Product/service context generation

## 📋 Individual Installation

You can also install tools individually:

```bash
opencli install https://github.com/Awannaphasch2016/blog-cli
opencli install https://github.com/Awannaphasch2016/demand-cli
opencli install https://github.com/Awannaphasch2016/supply-cli
# ... etc
```

## 🔧 Manual Installation

If you prefer manual installation:

```bash
# Create tools directory
mkdir ~/cli-tools && cd ~/cli-tools

# Install each tool
git clone https://github.com/Awannaphasch2016/blog-cli.git
cd blog-cli && npm install && npm link && cd ..

git clone https://github.com/Awannaphasch2016/demand-cli.git
cd demand-cli && npm install && npm link && cd ..

# ... repeat for other tools
```

## 🌟 Workflow Examples

### Content Creation Pipeline
```bash
# Generate content specification
spec generate "blog post about AI" --type blog > blog-spec.yaml

# Create new blog post
blog new "AI in Modern Development" --spec blog-spec.yaml

# Evaluate content quality
evaluate score draft.md --criteria quality,engagement

# Publish to Dev.to
blog publish draft.md
```

### Marketing Campaign Creation
```bash
# Generate audience insights
demand generate "tech-savvy millennials" > audience.json

# Create product context
supply generate "productivity app" > product.json

# Generate ad specifications
spec generate "social media ads" --type ads > ad-spec.yaml

# Create Meta ads
meta-ads generate ad-spec.yaml --variants 3
```

### Optimization Loop
```bash
# Analyze existing content
evaluate analyze existing-content.md > analysis.json

# Optimize prompt
optimize-prompt improve system-prompt.txt --based-on analysis.json

# Generate improved content
spec generate improved-content --prompt optimized-prompt.txt

# Compare results
evaluate compare original.md improved.md
```

## 🔑 Environment Setup

Set these environment variables for full functionality:

### Required
```bash
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

### Optional (for specific features)
```bash
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-key"
export DEVTO_API_KEY="your-devto-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export META_ACCESS_TOKEN="your-meta-token"
```

## 📚 Individual Tool Documentation

Each tool has comprehensive documentation:

- [blog-cli](https://github.com/Awannaphasch2016/blog-cli) - Blog publishing
- [demand-cli](https://github.com/Awannaphasch2016/demand-cli) - Audience analysis
- [evaluate-cli](https://github.com/Awannaphasch2016/evaluate-cli) - Content evaluation
- [meta-ads-cli](https://github.com/Awannaphasch2016/meta-ads-cli) - Ad generation
- [optimize-prompt-cli](https://github.com/Awannaphasch2016/optimize-prompt-cli) - Prompt optimization
- [spec-cli](https://github.com/Awannaphasch2016/spec-cli) - Specification generation
- [supply-cli](https://github.com/Awannaphasch2016/supply-cli) - Product context

## 🤖 AI Features

All tools feature:
- **Serverless Functions** - Deploy Lambda functions for scalable generation
- **AI Integration** - Powered by OpenAI, Anthropic, and other leading models
- **Workflow Chaining** - Tools designed to work together in pipelines
- **OpenCLI Compatible** - One-command installation and management

## 🔄 Serverless Support

Each CLI supports serverless functions for scalable deployment:

```bash
# Use different function versions
demand generate "audience" --function v1
supply generate "product" --function openai
meta-ads generate spec.yaml --function gpt

# Deploy functions
cd tool-name/lambda
npm run deploy
```

## 📄 License

MIT

## 🤝 Contributing

Each tool is maintained in its own repository. Please submit issues and PRs to the individual tool repositories.