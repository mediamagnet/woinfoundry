# Run this from the root of the WOINFoundry system folder
# Example:  PS> ./migrate.ps1

Write-Host "=== Foundry VTT v10 → v13 Migration Script ===" -ForegroundColor Cyan

# 1. Update system.json compatibility
$systemJson = "system.json"
if (Test-Path $systemJson) {
    Write-Host "Updating system.json compatibility..."

    $json = Get-Content $systemJson -Raw | ConvertFrom-Json

    if (-not $json.compatibility) {
        $json | Add-Member -MemberType NoteProperty -Name "compatibility" -Value @{ minimum = "13"; verified = "13" }
    } else {
        $json.compatibility.minimum = "13"
        $json.compatibility.verified = "13"
    }

    # Backup
    Copy-Item $systemJson "$systemJson.bak"

    # Save
    $json | ConvertTo-Json -Depth 10 | Set-Content $systemJson -Encoding UTF8

    Write-Host "system.json updated."
}

# 2. Recursively rewrite deprecated data paths
$extensions = @("*.hbs", "*.json", "*.js")
$patterns = @(
    @{ old = "data\."; new = "system." },
    @{ old = "actor.data"; new = "actor.system" },
    @{ old = "item.data"; new = "item.system" },
    @{ old = "this.object.data"; new = "this.object.system" }
)

Write-Host "Scanning files for deprecated patterns..."

foreach ($ext in $extensions) {
    Get-ChildItem -Recurse -Filter $ext | ForEach-Object {
        $file = $_.FullName
        $content = Get-Content $file -Raw
        $original = $content

        foreach ($p in $patterns) {
            $content = $content -replace [regex]::Escape($p.old), $p.new
        }

        if ($content -ne $original) {
            Copy-Item $file "$file.bak"
            Set-Content $file $content -Encoding UTF8
            Write-Host "Updated: $file"
        }
    }
}

# 3. Scan for deprecated APIs and warn
Write-Host "`nScanning for deprecated API usage..." -ForegroundColor Yellow

$deprecated = @(
    "mergeObject",
    "duplicate",
    "actor.data.data",
    "item.data.data",
    "createOwned",
    "getOwnedItem",
    "CONFIG.Item.documentClass",
    "CONFIG.Actor.documentClass"
)

foreach ($d in $deprecated) {
    $hits = Select-String -Path **\*.js -Pattern $d -SimpleMatch
    if ($hits) {
        Write-Host "`nFound deprecated usage: $d" -ForegroundColor Red
        $hits | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)  $($_.Line.Trim())" }
    }
}

Write-Host "`n=== Migration pass complete ===" -ForegroundColor Green
Write-Host "Backups created as *.bak next to modified files."
