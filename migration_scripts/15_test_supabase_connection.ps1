# =========================================================
# Test Supabase Connection - Troubleshooting Script
# =========================================================

Write-Host "Testing Supabase Connection..." -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Test DNS resolution
Write-Host "`n1. Testing DNS resolution..." -ForegroundColor Cyan
try {
    $dnsResult = Resolve-DnsName "db.oixpqxxnhxtxwkeigjka.supabase.co" -ErrorAction Stop
    Write-Host "✅ DNS resolution successful!" -ForegroundColor Green
    Write-Host "   IP Address: $($dnsResult.IPAddress)" -ForegroundColor White
} catch {
    Write-Host "❌ DNS resolution failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Try using Google DNS
    Write-Host "`n   Trying with Google DNS (8.8.8.8)..." -ForegroundColor Yellow
    try {
        $dnsResult = Resolve-DnsName "db.oixpqxxnhxtxwkeigjka.supabase.co" -Server "8.8.8.8" -ErrorAction Stop
        Write-Host "   ✅ DNS resolution with Google DNS successful!" -ForegroundColor Green
        Write-Host "   IP Address: $($dnsResult.IPAddress)" -ForegroundColor White
    } catch {
        Write-Host "   ❌ DNS resolution with Google DNS also failed!" -ForegroundColor Red
    }
}

# Test basic connectivity
Write-Host "`n2. Testing basic connectivity..." -ForegroundColor Cyan
try {
    $pingResult = Test-NetConnection "db.oixpqxxnhxtxwkeigjka.supabase.co" -Port 5432 -ErrorAction Stop
    if ($pingResult.TcpTestSucceeded) {
        Write-Host "✅ Port 5432 is reachable!" -ForegroundColor Green
    } else {
        Write-Host "❌ Port 5432 is not reachable!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Connectivity test failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test with curl (alternative method)
Write-Host "`n3. Testing with curl..." -ForegroundColor Cyan
try {
    $curlResult = curl.exe -v "db.oixpqxxnhxtxwkeigjka.supabase.co:5432" 2>&1
    if ($curlResult -match "Connected") {
        Write-Host "✅ Curl connection successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Curl connection failed!" -ForegroundColor Red
        Write-Host "   Result: $curlResult" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Curl test failed!" -ForegroundColor Red
}

# Check network configuration
Write-Host "`n4. Network Configuration..." -ForegroundColor Cyan
$dnsServers = Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses -ne $null}
Write-Host "Current DNS servers:" -ForegroundColor White
foreach ($adapter in $dnsServers) {
    Write-Host "   $($adapter.InterfaceAlias): $($adapter.ServerAddresses -join ', ')" -ForegroundColor White
}

Write-Host "`n5. Recommendations:" -ForegroundColor Cyan
Write-Host "   • Check your internet connection" -ForegroundColor White
Write-Host "   • Verify firewall settings" -ForegroundColor White
Write-Host "   • Try connecting from a different network" -ForegroundColor White
Write-Host "   • Consider using Supabase Dashboard export instead" -ForegroundColor White