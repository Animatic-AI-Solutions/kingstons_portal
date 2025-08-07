# Database Documentation

This directory contains comprehensive, auto-generated documentation for the Kingston's Portal database structure.

## 📋 Quick Access

| Document | Description | Last Updated |
|----------|-------------|--------------|
| **[Database Overview](./01_database_overview.md)** | Complete guide to database documentation and architecture | Latest |
| **[Structure Documentation](./database_structure_documentation.sql)** | Complete SQL schema with all tables, views, functions | 2025-08-07 |
| **[Analysis Report](./database_analysis_report.md)** | Architectural analysis and performance insights | 2025-08-07 |

## 🗄️ Database Summary

- **Database:** kingstons_portal (PostgreSQL 17.5)
- **Tables:** 22 core tables
- **Views:** 24 optimized views  
- **Functions:** 2 custom functions
- **Indexes:** 53 performance indexes
- **Foreign Keys:** 25 relationships

## ⚡ Key Performance Features

- **Ultra-Fast Analytics:** Pre-computed views for sub-second dashboard performance
- **Smart Caching:** 24-hour cache validity with background refresh
- **Strategic Indexing:** 53 optimized indexes for frequently queried data
- **Bulk Data Patterns:** Optimized views for efficient data retrieval

## 🔄 Regenerating Documentation

```bash
# From backend directory with virtual environment activated
python update_database_docs.py
```

This automated script will:
1. ✅ Connect to the live database
2. 📊 Extract complete schema information
3. 🔍 Analyze relationships and performance
4. 📁 Organize files in this documentation folder
5. 📋 Generate update summary

## 🏗️ Database Architecture

```
Client Groups (Root)
├── Product Owners (People)
├── Client Products (Financial Products)
│   ├── Portfolios (Investment Containers)
│   │   └── Portfolio Funds (Individual Fund Holdings)
│   │       ├── Portfolio Fund Valuations (Market Values)
│   │       ├── Portfolio Fund IRR Values (Performance)
│   │       └── Holding Activity Log (Transactions)
│   └── Provider Switch Log (Provider Changes)
└── Authentication & Session Management
```

## 📚 Related Documentation

- [System Architecture Overview](../3_architecture/01_system_architecture_overview.md)
- [Database Schema Conceptual](../3_architecture/03_database_schema.md)
- [API Design](../3_architecture/04_api_design.md)
- [Performance Optimizations](../6_advanced/02_performance_optimizations.md)

---

*This documentation is automatically generated from the live database schema. For questions about database structure or to report issues, please refer to the development team.*
