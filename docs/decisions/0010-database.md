# 🗄️ Database Decision
- Status: accepted

## 📚 Context
Bukie requires a reliable, scalable, and well-supported database for storing application data. Options considered include PostgreSQL, SQLite, and MongoDB.

## 🎯 Decision Drivers
- Reliability and ACID compliance
- Scalability and performance
- Ecosystem and community support
- Compatibility with Bun/Elysia and Azure
- Cost and operational simplicity

## 🔍 Considered Options
- PostgreSQL
- SQLite
- MongoDB

## ✅ Decision Outcome
PostgreSQL is chosen as the database for Bukie.

### 💡 Rationale
- PostgreSQL is a proven, reliable, and scalable relational database with strong ACID guarantees.
- It integrates well with Bun/Elysia and is natively supported by Azure (managed PostgreSQL service).
- Rich ecosystem, excellent documentation, and strong community support.
- Easy to scale as the project grows, with flexible data modeling and robust features.

## ⚖️ Pros and Cons
### PostgreSQL
**👍 Pros:**
- Reliable and ACID-compliant
- Scalable and performant
- Rich ecosystem and tooling
- Native support in Azure
**👎 Cons:**
- Requires more setup than SQLite
- May be overkill for very small apps

### SQLite
**👍 Pros:**
- Simple and lightweight
- No server required
**👎 Cons:**
- Not suitable for scaling or multi-user apps
- Limited features compared to PostgreSQL

### MongoDB
**👍 Pros:**
- Flexible schema
- Good for unstructured data
**👎 Cons:**
- Less strict data integrity
- Not natively supported in Azure as a managed service

## 📋 Consequences
- Bukie will use PostgreSQL for all persistent data
- Azure managed PostgreSQL service will be used for production
- Future migration to other databases is possible if requirements change
