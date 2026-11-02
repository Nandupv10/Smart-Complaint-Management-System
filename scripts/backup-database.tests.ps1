# Configuration-failure checks do not invoke mysqldump; the retention-isolation check uses a fake client.
$script = Join-Path $PSScriptRoot 'backup-database.ps1'
$temporaryDirectory = Join-Path $env:TEMP 'scms-backup-script-test'

& $script -OutputDirectory $temporaryDirectory -Database 'scms_test' -DefaultsFile 'missing-option-file.cnf' -MySqlDumpPath 'missing-mysqldump.exe'
if ($LASTEXITCODE -eq 0) {
    throw 'Expected backup script to reject a missing MySQL option file.'
}

& $script -OutputDirectory $temporaryDirectory -Database '../unsafe' -DefaultsFile 'missing-option-file.cnf' -MySqlDumpPath 'missing-mysqldump.exe'
if ($LASTEXITCODE -eq 0) {
    throw 'Expected backup script to reject an unsafe database name.'
}

Write-Host 'Backup script safety smoke tests passed.'

$retentionDirectory = Join-Path $env:TEMP "scms-backup-retention-test-$([guid]::NewGuid())"
$defaultsFile = Join-Path $retentionDirectory 'backup-client.cnf'
$fakeMySqlDump = Join-Path $retentionDirectory 'mysqldump.cmd'
$currentDatabaseOldBackup = Join-Path $retentionDirectory 'scms-scms_test-20200101T000000Z.sql'
$otherDatabaseOldBackup = Join-Path $retentionDirectory 'scms-other_database-20200101T000000Z.sql'
$unrelatedSqlFile = Join-Path $retentionDirectory 'unrelated-20200101.sql'

try {
    New-Item -ItemType Directory -Path $retentionDirectory -Force | Out-Null
    Set-Content -LiteralPath $defaultsFile -Value '[client]' -NoNewline
    Set-Content -LiteralPath $fakeMySqlDump -Value @(
        '@echo off',
        'echo CREATE TABLE test ^(id INT^);',
        'exit /b 0'
    )
    Set-Content -LiteralPath $currentDatabaseOldBackup -Value 'old SCMS test backup' -NoNewline
    Set-Content -LiteralPath $otherDatabaseOldBackup -Value 'other database backup' -NoNewline
    Set-Content -LiteralPath $unrelatedSqlFile -Value 'unrelated SQL file' -NoNewline
    $oldTimestamp = [DateTime]::UtcNow.AddDays(-8)
    (Get-Item -LiteralPath $currentDatabaseOldBackup).LastWriteTimeUtc = $oldTimestamp
    (Get-Item -LiteralPath $otherDatabaseOldBackup).LastWriteTimeUtc = $oldTimestamp

    & $script -OutputDirectory $retentionDirectory -Database 'scms_test' -DefaultsFile $defaultsFile -MySqlDumpPath $fakeMySqlDump
    if ($LASTEXITCODE -ne 0) {
        throw 'Expected the backup script to complete successfully with the fake mysqldump.'
    }
    if (Test-Path -LiteralPath $currentDatabaseOldBackup) {
        throw 'Expected the expired backup for the current database to be removed.'
    }
    if (-not (Test-Path -LiteralPath $otherDatabaseOldBackup)) {
        throw 'Retention must not remove an expired backup for another database.'
    }
    if (-not (Test-Path -LiteralPath $unrelatedSqlFile)) {
        throw 'Retention must not remove an unrelated SQL file.'
    }
} finally {
    if (Test-Path -LiteralPath $retentionDirectory) {
        Remove-Item -LiteralPath $retentionDirectory -Recurse -Force
    }
}

Write-Host 'Backup retention isolation smoke test passed.'
