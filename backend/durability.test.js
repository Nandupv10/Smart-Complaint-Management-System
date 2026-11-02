const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const backupScript = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'backup-database.ps1'),
    'utf8'
);

test('NFR04 stores users and complaints in transactional InnoDB tables', () => {
    assert.match(schema, /CREATE TABLE IF NOT EXISTS users[\s\S]*?ENGINE=InnoDB;/i);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS complaints[\s\S]*?ENGINE=InnoDB;/i);
});

test('NFR04 backup script uses secure configuration and narrow seven-day retention', () => {
    assert.match(backupScript, /SCMS_MYSQL_DEFAULTS_FILE/);
    assert.match(backupScript, /--single-transaction/);
    assert.match(backupScript, /AddDays\(-7\)/);
    assert.match(backupScript, /\[regex\]::Escape\(\$Database\)/);
    assert.match(backupScript, /\$_.Name -match \$ownedName/);
    assert.match(backupScript, /\$LASTEXITCODE -ne 0/);
});
