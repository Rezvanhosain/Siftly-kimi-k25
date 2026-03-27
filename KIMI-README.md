<details>
<summary>📋 Click to see the KIMI-README.md content (copy this):</summary>
# Siftly — Kimi K2.5 Edition 🚀
<div align="center">
  <h1>Siftly — Kimi K2.5 Edition</h1>
  <p><strong>Self-hosted Twitter/X bookmark manager powered by Moonshot AI (Kimi K2.5)</strong></p>
</div>
---
## 🚀 Quick Start with Docker
### Prerequisites
- Docker & Docker Compose
- Moonshot API Key ([Get one here](https://platform.moonshot.cn))
### One-Command Start
```bash
git clone https://github.com/Rezvanhosain/Siftly-kimi-k25.git
cd Siftly-kimi-k25
cp .env.example .env
# Edit .env and add your Moonshot API key
cd docker && docker-compose up -d
Access: http://localhost:3000
---
🐳 Docker Commands
# Start
cd docker && docker-compose up -d
# View logs
cd docker && docker-compose logs -f
# Stop
cd docker && docker-compose down
---
⚙️ Configuration
Variable	Required
OPENAI_API_KEY	✅ Yes
OPENAI_BASE_URL	✅ Yes
OPENAI_MODEL	❌ No
---
## 🆘 Troubleshooting
**"Invalid API key" error:**
- Verify your key starts with `sk-`
- Check `OPENAI_BASE_URL` is set to `https://api.moonshot.cn/v1`
**AI not working:**
- Go to Settings page in the app
- Verify it shows "OpenAI" as provider and "kimi-k2.5" as model
---
📝 Changelog
v1.0-kimi-ready
- ✅ Migrated from Anthropic to Moonshot AI
- ✅ Kimi K2.5 as default model
- ✅ Docker-first deployment
- ✅ Updated documentation
</details>
