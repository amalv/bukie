# 🏗️ Infrastructure as Code Decision
- Status: superseded

> Historical note: Bukie's current deployment flow relies on Vercel project configuration and managed integrations rather than committed IaC. This ADR is retained for the earlier Azure/Bicep exploration.

## 📚 Context
Bukie aims for repeatable, automated, and versioned cloud infrastructure. Options include Bicep (Azure-native), Terraform, Pulumi, and CDK.

## 🎯 Decision Drivers
- Simplicity and native Azure support
- Developer experience and learning curve
- Automation and repeatability
- Cost and operational overhead
- Community and documentation

## 🔍 Considered Options
- Bicep
- Terraform
- Pulumi
- CDK

## ✅ Decision Outcome
Bicep is chosen as the Infrastructure as Code tool for Bukie.

### 💡 Rationale
- Bicep is Azure-native, easy to learn, and integrates tightly with Azure CLI and portal.
- It provides a clean, declarative syntax and is well-documented.
- Ideal for pure Azure projects, with best-in-class support and rapid evolution.
- Terraform is powerful for multi-cloud, but Bicep is simpler for Azure-only setups.

## ⚖️ Pros and Cons
### Bicep
**👍 Pros:**
- Native Azure support
- Simple, clean syntax
- Fast learning curve
- Tight integration with Azure CLI/portal
**👎 Cons:**
- Azure-only (not multi-cloud)
- Newer than Terraform, smaller ecosystem

### Terraform
**👍 Pros:**
- Multi-cloud support
- Large ecosystem
**👎 Cons:**
- More complex for Azure-only projects
- Requires additional setup

### Pulumi / CDK
**👍 Pros:**
- Code-first, supports multiple languages
**👎 Cons:**
- More advanced, less common for small Azure projects
- Higher learning curve

## 📋 Consequences
- Bukie will use Bicep for all infrastructure automation
- Future migration to Terraform or other tools is possible if requirements change
- Infrastructure will be versioned and repeatable from the start
