# Fix Documentation Links Script
Write-Host "Fixing documentation links..." -ForegroundColor Cyan

$docsPath = "c:\newdev\ubos\docs"
$mdFiles = Get-ChildItem -Path $docsPath -Filter "*.md" -Recurse

$totalFiles = 0

foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw
    if (-not $content) { continue }
    
    $original = $content
    
    # Replace patterns
    $content = $content -replace '\]\(\.\./\.\./shared/', '](/shared/'
    $content = $content -replace '\]\(\.\./\.\./server/', '](/server/'
    $content = $content -replace '\]\(\.\./\.\./client/', '](/client/'
    $content = $content -replace '\]\(\.\./\.\./tests/', '](/tests/'
    $content = $content -replace '\]\(\.\./\.\./tasks/', '](/tasks/'
    $content = $content -replace '\]\(\.\./\.\./PLAN\.md', '](/PLAN.md'
    $content = $content -replace '\]\(\.\./PLAN\.md', '](/PLAN.md'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalFiles++
        $relativePath = $file.FullName -replace [regex]::Escape("c:\newdev\ubos\docs\"), ""
        Write-Host "  Fixed: $relativePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Complete! Files modified: $totalFiles" -ForegroundColor Yellow


