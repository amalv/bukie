# ☁️ Cloud Provider Decision
- Status: accepted

## 📚 Context
Bukie requires a reliable, cost-effective cloud provider for hosting backend, database, and future services. Options include AWS, Google Cloud, Azure, and multi-cloud strategies.

## 🎯 Decision Drivers
- Cost and pay-per-use pricing
- Developer experience and tooling
- Compatibility with Bun/Elysia and PostgreSQL
- Scalability and global availability
- Ease of deployment and CI/CD integration

## 🔍 Considered Options
- AWS
- Google Cloud
- Azure
- Multi-cloud

## ✅ Decision Outcome
Azure is chosen as the sole cloud provider for Bukie.

### 💡 Rationale
Azure offers excellent support for container-based deployments (Azure Container Apps, App Service), which is ideal for Bun/Elysia.
Pay-per-use pricing helps minimize costs for early-stage projects.
Azure provides strong managed PostgreSQL services and global reach.
Developer experience, documentation, and CI/CD integration are robust and modern.

## ⚖️ Pros and Cons
### Azure
**👍 Pros:**
- Great support for containers and Bun/Elysia
- Managed PostgreSQL services
- Pay-per-use pricing
- Modern developer experience
**👎 Cons:**
- May require learning new Azure-specific tooling
- Some features may be region-specific

### Google Cloud
**👍 Pros:**
- Excellent support for container-based deployments (Cloud Run)
- Managed PostgreSQL services
- Simple pay-per-use pricing
- Good developer experience and documentation
**👎 Cons:**
- Smaller ecosystem than Azure/AWS
- Some features may be region-specific
- May require learning Google Cloud-specific tooling

### AWS
**👍 Pros:**
- Largest cloud ecosystem
- Many managed services
**👎 Cons:**
- Can be more complex and expensive for small projects

### Multi-cloud
**👍 Pros:**
- Flexibility and redundancy
**👎 Cons:**
- Increased complexity and management overhead

## 📋 Consequences
- Bukie will use Azure for hosting and managed services
- Container-based deployment will be favored for backend
- Future migration to other providers is possible if requirements change
