$excludedFiles = @('pnpm-lock.yaml', 'package-lock.json', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp')
$excludedDirs = @('\.git', 'node_modules', 'dist', '\.wrangler', '\.worktrees')

function Should-Exclude($path) {
    foreach ($dir in $excludedDirs) {
        if ($path -match $dir) { return $true }
    }
    foreach ($ext in $excludedFiles) {
        if ($path.EndsWith($ext)) { return $true }
    }
    return $false
}

$files = Get-ChildItem -Recurse -File | Where-Object { -not (Should-Exclude $_.FullName) }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($null -eq $content) { continue }
    
    if ($content -match "standard" -or $content -match "Standard" -or $content -match "STANDARD") {
        # Strict replacements
        $newContent = $content -creplace 'standard', 'standard'
        $newContent = $newContent -creplace 'Standard', 'Standard'
        $newContent = $newContent -creplace 'STANDARD', 'STANDARD'
        
        Set-Content -Path $file.FullName -Value $newContent
        Write-Output "Renamed inside: $($file.FullName)"
    }
}

