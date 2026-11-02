[CmdletBinding()]
param(
    [string]$OutputDirectory = $env:SCMS_BACKUP_DIR,
    [string]$Database = $env:DB_NAME,
    [string]$DefaultsFile = $env:SCMS_MYSQL_DEFAULTS_FILE,
    [string]$MySqlDumpPath = $env:MYSQLDUMP_PATH
)

$ErrorActionPreference = 'Stop'

function Stop-Backup([string]$Message) {
    [Console]::Error.WriteLine("SCMS backup failed: $Message")
    exit 1
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    Stop-Backup 'SCMS_BACKUP_DIR (or -OutputDirectory) is required.'
}
if ([string]::IsNullOrWhiteSpace($Database) -or $Database -notmatch '^[A-Za-z0-9_]+$') {
    Stop-Backup 'DB_NAME (or -Database) must contain only letters, numbers, and underscores.'
}
if ([string]::IsNullOrWhiteSpace($DefaultsFile) -or -not (Test-Path -LiteralPath $DefaultsFile -PathType Leaf)) {
    Stop-Backup 'SCMS_MYSQL_DEFAULTS_FILE must name an existing MySQL option file.'
}
if ([string]::IsNullOrWhiteSpace($MySqlDumpPath)) {
    $command = Get-Command mysqldump.exe -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        $command = Get-Command mysqldump -ErrorAction SilentlyContinue
    }
    if ($null -eq $command) {
        Stop-Backup 'mysqldump was not found. Install MySQL client tools or set MYSQLDUMP_PATH.'
    }
    $MySqlDumpPath = $command.Source
}
if (-not (Test-Path -LiteralPath $MySqlDumpPath -PathType Leaf)) {
    Stop-Backup 'MYSQLDUMP_PATH does not point to a file.'
}

try {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
} catch {
    Stop-Backup "cannot create or access output directory: $($_.Exception.Message)"
}

$utcStamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backupName = "scms-$Database-$utcStamp.sql"
$backupPath = Join-Path -Path $OutputDirectory -ChildPath $backupName

try {
    # Credentials stay in the MySQL option file; none are written to logs or arguments.
    & $MySqlDumpPath "--defaults-extra-file=$DefaultsFile" '--single-transaction' '--routines' '--events' $Database |
        Out-File -LiteralPath $backupPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump exited with code $LASTEXITCODE"
    }
    if (-not (Test-Path -LiteralPath $backupPath -PathType Leaf) -or (Get-Item -LiteralPath $backupPath).Length -eq 0) {
        throw 'mysqldump produced no backup data'
    }
} catch {
    if (Test-Path -LiteralPath $backupPath -PathType Leaf) {
        Remove-Item -LiteralPath $backupPath -Force
    }
    Stop-Backup $_.Exception.Message
}

$cutoff = [DateTime]::UtcNow.AddDays(-7)
$ownedName = "^scms-$([regex]::Escape($Database))-\d{8}T\d{6}Z\.sql$"
try {
    Get-ChildItem -LiteralPath $OutputDirectory -File -Filter 'scms-*.sql' | Where-Object {
        $_.Name -match $ownedName -and $_.LastWriteTimeUtc -lt $cutoff
    } | ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        Write-Host "Removed expired SCMS backup: $($_.Name)"
    }
} catch {
    Stop-Backup "backup was created, but retention cleanup failed: $($_.Exception.Message)"
}

Write-Host "SCMS backup created: $backupPath"
exit 0
