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
- **PostgreSQL Database:** Access to a PostgreSQL database server.
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
Copy and paste the following into your `.env` file, replacing the example values with your actual PostgreSQL configuration:

```env
# PostgreSQL Database Configuration (REQUIRED)
DATABASE_URL=postgresql://kingstons_app:password@host:port/kingstons_portal

# Security Configuration (REQUIRED)
JWT_SECRET=your-jwt-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Development Settings
DEBUG=true
API_HOST=127.0.0.1
API_PORT=8001
```

#### Environment Variable Details
| Variable                    | Description                                                                                             | Example Value                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`             | The PostgreSQL connection string for the database.                                                      | `postgresql://username:password@localhost:5432/kingstons_portal` |
| `JWT_SECRET`               | **(Required)** Secret key for signing JWT tokens. Generate a secure random string.                     | `your-secure-jwt-secret-key`                               |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long access tokens remain valid (in minutes).                                                    | `1440` (24 hours)                                           |

**Note:** The `.env` file is included in `.gitignore` and should never be committed to version control.

## 3. Backend Setup

### Step 1: Set up the PostgreSQL Database

The application uses PostgreSQL as the database backend for enhanced security and compliance with financial data requirements.

1.  **Ensure PostgreSQL is available:** You need access to a PostgreSQL server (local or remote).
2.  **Create the database:** Create a new database named `kingstons_portal`.
3.  **Import the database schema:**
   - Connect to your PostgreSQL server using a client (psql, pgAdmin, etc.)
   - Execute the contents of `database.sql` to set up the schema and views
4.  **Create a database user:** Create a dedicated user for the application with appropriate permissions.
5.  **Update your `.env` file** with the PostgreSQL connection string in the `DATABASE_URL` variable.

**Security Note:** The application stores sensitive client financial data locally within your organization's secure network infrastructure, providing complete control over data sovereignty and compliance.

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