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