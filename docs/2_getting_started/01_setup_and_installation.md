---
title: "Setup and Installation"
tags: ["getting_started", "setup", "installation", "env", "docker"]
related_docs:
  - "./02_running_the_application.md"
  - "../6_advanced/03_deployment_process.md"
---
# Setup and Installation Guide

This guide provides step-by-step instructions for setting up the Kingston's Portal development environment on a local machine.

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your system:

- **Git:** For cloning the repository.
- **Node.js & npm:** For managing frontend dependencies and running the React development server. (LTS version recommended)
- **Python:** For the FastAPI backend. (Version 3.9+ recommended)
- **Supabase Account:** For cloud-hosted PostgreSQL database access.
- **PowerShell** (for Windows) or a Unix-like shell (for macOS/Linux).

## 2. Environment Setup

### Step 1: Clone the Repository
Open your terminal, navigate to the directory where you want to store the project, and clone the repository from GitHub:

```bash
git clone <your-repository-url>
cd kingstons_portal
```

### Step 2: Configure Environment Variables

The backend requires a `.env` file for configuration.

1.  Navigate to the `backend` directory.
2.  Create a new `.env` file:
    ```powershell
    # In the 'kingstons_portal/backend' directory
    New-Item -Path ".env" -ItemType File
    ```
3.  Open the newly created `.env` file in your text editor and add the following variables:

#### Environment Variable Template
Copy and paste the following into your `.env` file, replacing the example values with your actual Supabase configuration:

```env
# Supabase Database Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Security Configuration (REQUIRED)
# This MUST match the JWT Secret in your Supabase project settings
JWT_SECRET=your-supabase-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Optional Development Settings
DEBUG=true
API_HOST=127.0.0.1
API_PORT=8001
```

#### Environment Variable Details
| Variable                    | Description                                                                                             | Example Value                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `SUPABASE_URL`             | The URL of your Supabase project.                                                                       | `https://abcdefgh.supabase.co`                             |
| `SUPABASE_KEY`             | The anonymous/public key from your Supabase project settings.                                           | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`                   |
| `JWT_SECRET`               | **(Required)** The JWT secret from your Supabase project settings. The application uses this to sign its own tokens. | `your-supabase-jwt-secret-from-settings`                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long access tokens remain valid (in minutes).                                                    | `1440` (24 hours)                                           |

**Note:** The `.env` file is included in `.gitignore` and should never be committed to version control.

## 3. Backend Setup

### Step 1: Set up the Database with Supabase

The application currently uses Supabase as the cloud-hosted PostgreSQL database. **Note:** A migration to in-house PostgreSQL is planned for enhanced security and compliance with financial data requirements. See [Database Migration Strategy](../6_advanced/04_database_migration_strategy.md) for details.

1.  **Create a Supabase account** at [supabase.com](https://supabase.com) if you don't have one.
2.  **Create a new project** in your Supabase dashboard.
3.  **Import the database schema:**
   - Navigate to the SQL editor in your Supabase dashboard
   - Copy and execute the contents of `database.sql` to set up the schema and views
4.  **Obtain your connection credentials** from the project settings:
   - Project URL (SUPABASE_URL)
   - Anonymous/Public key (SUPABASE_KEY)  
   - JWT Secret (JWT_SECRET)
5.  **Update your `.env` file** with the Supabase credentials obtained above.

**Security Note:** Given the sensitive nature of client financial data, the application is designed to support migration to an in-house PostgreSQL server for enhanced data sovereignty and compliance.

### Step 2: Install Python Dependencies

1.  Navigate to the `backend` directory.
2.  Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```
3.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

## 4. Frontend Setup

1.  Navigate to the `frontend` directory.
2.  Install the Node.js dependencies:
    ```bash
    npm install
    ```

## 5. Setup Complete

Your development environment is now fully configured. See the [**Running the Application**](./02_running_the_application.md) guide for instructions on how to start the servers. 