# Kingston's Portal - Production Deployment Scripts

This directory contains automated deployment scripts for Kingston's Portal based on the production architecture documented in `docs/6_advanced/03_deployment_process.md`.

## Scripts Overview

### 1. `deploy_simple.ps1` - Basic Deployment Script
A straightforward script that follows your original requirements exactly:
- Git pull
- Install Python dependencies (`pip install -r requirements.txt`)
- Install Node.js dependencies (`npm install`)
- Build frontend (`npm run build`)
- Copy backend folder to `C:\Apps\portal_api`
- Restart Windows service
- Run `iisreset`

### 2. `deploy_production.ps1` - Advanced Deployment Script
A comprehensive script with additional features:
- Pre-flight checks and validation
- Automatic backup creation
- Detailed error handling
- Flexible parameters
- Dry-run mode
- Service management

### 3. `setup_service.ps1` - Service Configuration Script
Sets up the Windows service using NSSM (Non-Sucking Service Manager):
- Configures FastAPI backend as Windows service
- Sets up Windows Firewall rules
- Manages service lifecycle

## Quick Start

### First Time Setup

1. **Install NSSM** (if not already installed):
   - Download from https://nssm.cc/download
   - Extract `nssm.exe` to `C:\Tools\`

2. **Run service setup** (as Administrator):
   ```powershell
   .\setup_service.ps1
   ```

3. **Deploy the application**:
   ```powershell
   .\deploy_simple.ps1
   ```

### Regular Deployments

For regular updates, simply run:
```powershell
.\deploy_simple.ps1
```

## Prerequisites

Before running any deployment script, ensure you have:

- **Git** - For repository operations
- **Python 3.9+** - For backend dependencies
- **Node.js & npm** - For frontend dependencies
- **Administrator privileges** - For service and IIS operations
- **Virtual environment** - Should exist in `backend\venv`

## Production Architecture

Based on the documentation, the production setup uses:

### Frontend (IIS)
- **Location**: `C:\inetpub\wwwroot\OfficeIntranet`
- **URL**: `http://intranet.kingston.local`
- **Server**: IIS on port 80

### Backend (FastAPI Service)
- **Location**: `C:\Apps\portal_api`
- **URL**: `http://intranet.kingston.local:8001`
- **Service**: Windows Service via NSSM

## Script Usage

### deploy_simple.ps1

The basic deployment script with no parameters:

```powershell
# Run as Administrator
.\deploy_simple.ps1
```

**What it does:**
1. Pulls latest code from git
2. Installs Python dependencies in backend virtual environment
3. Installs Node.js dependencies in frontend
4. Builds frontend production assets (automatically goes to IIS directory)
5. Copies backend files to `C:\Apps\portal_api`
6. Installs production dependencies
7. Restarts "Kingston Portal API" service
8. Runs `iisreset`

### deploy_production.ps1

The advanced deployment script with full customization:

```powershell
# Basic usage
.\deploy_production.ps1

# Skip specific steps
.\deploy_production.ps1 -SkipGitPull -SkipDependencies

# Dry run (see what would happen without making changes)
.\deploy_production.ps1 -DryRun

# Custom paths
.\deploy_production.ps1 -BackendDestination "C:\MyApps\portal_api" -ServiceName "My Portal API"

# Skip service operations (if service isn't set up yet)
.\deploy_production.ps1 -SkipServiceRestart -SkipIISReset
```

**Parameters:**
- `-SkipGitPull` - Skip pulling from git
- `-SkipDependencies` - Skip installing dependencies
- `-SkipBuild` - Skip frontend build
- `-SkipBackendCopy` - Skip copying backend files
- `-SkipServiceRestart` - Skip Windows service restart
- `-SkipIISReset` - Skip IIS reset
- `-DryRun` - Show what would happen without making changes
- `-BackendDestination` - Custom backend path (default: `C:\Apps\portal_api`)
- `-ServiceName` - Custom service name (default: `Kingston Portal API`)

### setup_service.ps1

One-time service configuration:

```powershell
# Run as Administrator
.\setup_service.ps1

# Custom paths
.\setup_service.ps1 -BackendPath "C:\MyApps\portal_api" -NSSMPath "C:\Tools\nssm.exe"
```

**Parameters:**
- `-BackendPath` - Backend installation path (default: `C:\Apps\portal_api`)
- `-ServiceName` - Windows service name (default: `Kingston Portal API`)
- `-NSSMPath` - Path to NSSM executable (default: `C:\Tools\nssm.exe`)

## Important Notes

### Virtual Environment
The scripts assume a Python virtual environment exists at `backend\venv`. If it doesn't exist, the script will attempt to create it.

### Environment Variables
The backend requires a `.env` file with Supabase credentials. The deployment scripts preserve existing `.env` files in the production directory.

### IIS Configuration
Your Vite configuration (`frontend/vite.config.js`) is already set to build directly to the IIS directory:
```javascript
build: {
  outDir: 'C:\\inetpub\\wwwroot\\OfficeIntranet',
  // ...
}
```

### Service Management
After initial setup, you can manage the service using standard Windows commands:
```powershell
# Start service
Start-Service "Kingston Portal API"

# Stop service
Stop-Service "Kingston Portal API"

# Check status
Get-Service "Kingston Portal API"

# Restart service
Restart-Service "Kingston Portal API"
```

## Troubleshooting

### Common Issues

1. **"Virtual environment not found"**
   - Ensure `backend\venv` exists and contains Python
   - Run `python -m venv venv` in the backend directory

2. **"Service not found"**
   - Run `setup_service.ps1` first to configure the Windows service
   - Check if NSSM is installed and accessible

3. **"Permission denied"**
   - Run PowerShell as Administrator
   - Check file permissions on destination directories

4. **"Port 8001 already in use"**
   - Check if another service is using port 8001
   - Stop conflicting services or change the port

### Verification

After deployment, verify everything is working:

1. **Frontend**: Visit `http://intranet.kingston.local`
2. **Backend API**: Visit `http://intranet.kingston.local:8001/docs`
3. **Service Status**: Run `Get-Service "Kingston Portal API"`

### Log Files

Check Windows Event Viewer for service-related errors:
- Windows Logs → Application
- Look for events from "Kingston Portal API"

## File Structure

After deployment, your production structure should look like:

```
C:\Apps\portal_api\
├── main.py
├── requirements.txt
├── .env
├── venv\
├── app\
│   ├── api\
│   ├── models\
│   └── utils\
└── (other backend files)

C:\inetpub\wwwroot\OfficeIntranet\
├── index.html
├── assets\
├── web.config
└── (other frontend build files)
```

## Support

For issues related to:
- **Architecture**: See `docs/6_advanced/03_deployment_process.md`
- **Development**: See `docs/2_getting_started/`
- **Security**: See `docs/6_advanced/01_security_considerations.md`

## Version History

- **v1.0** - Initial deployment scripts
- **v1.1** - Added service setup script
- **v1.2** - Enhanced error handling and backup features 