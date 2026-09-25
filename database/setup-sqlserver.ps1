# ============================================================
# Chuẩn bị SQL Server Express cho backend QuanLyKhachSan
# Chạy MỘT LẦN với quyền Administrator (PowerShell Run as Administrator):
#   powershell -ExecutionPolicy Bypass -File setup-sqlserver.ps1
# Script làm: bật TCP cổng 1433, bật SQL Auth (mixed mode),
# tạo login 'hotel_app' / 'Hotel@2026' với quyền db_owner trên hotel_db,
# khởi động lại dịch vụ SQL Express.
# ============================================================
$ErrorActionPreference = 'Stop'

# --- 1. Registry config (cần Admin) ---
$key = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\'
$instKey = Get-ChildItem $key | Where-Object { $_.Name -like '*SQLEXPRESS' } | Select-Object -First 1
if (-not $instKey) { throw 'Khong tim thay instance SQLEXPRESS' }
$root = 'HKLM:' + $instKey.Name.Substring('HKEY_LOCAL_MACHINE'.Length)

$tcp = "$root\MSSQLServer\SuperSocketNetLib\Tcp"
Set-ItemProperty -Path $tcp -Name Enabled -Value 1
Set-ItemProperty -Path "$tcp\IPAll" -Name TcpDynamicPorts -Value ''
Set-ItemProperty -Path "$tcp\IPAll" -Name TcpPort -Value '1433'
Set-ItemProperty -Path "$root\MSSQLServer" -Name LoginMode -Value 2   # Mixed mode (SQL + Windows auth)

# --- 2. Khoi dong lai dich vu ---
Restart-Service 'MSSQL$SQLEXPRESS' -Force
Start-Sleep -Seconds 6
Write-Output ("Service: " + (Get-Service 'MSSQL$SQLEXPRESS').Status)

# --- 3. Tao SQL login + user (qua Windows auth cua chinh admin) ---
$sql = @'
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'hotel_app')
  CREATE LOGIN hotel_app WITH PASSWORD = 'Hotel@2026', CHECK_POLICY = ON;
IF DB_ID('hotel_db') IS NULL
  CREATE DATABASE hotel_db;
USE hotel_db;
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'hotel_app')
BEGIN
  CREATE USER hotel_app FOR LOGIN hotel_app;
  ALTER ROLE db_owner ADD MEMBER hotel_app;
END
'@
$sql | Out-File -Encoding utf8 "$env:TEMP\hotel-setup.sql"
sqlcmd -S "localhost,1433" -E -i "$env:TEMP\hotel-setup.sql"
Write-Output "Done. Test ket noi: sqlcmd -S localhost,1433 -U hotel_app -P Hotel@2026 -Q ""SELECT name FROM sys.databases"""
