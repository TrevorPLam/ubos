# Filter task files by role type
# Maps each role to its primary task type and filters all task files accordingly

$roleTypeMap = @{
    "accessibility-specialist" = "a11y"
    "arbitration" = "arbitration"
    "cicd-automation" = "ci"
    "code-review-refactoring" = "quality"
    "compliance-regulatory" = "compliance"
    "cost-optimization-cloud-economics" = "cost"
    "customer-support-operations" = "support"
    "data-engineering-analytics" = "data"
    "data-science-ml-integration" = "ml"
    "dependency-resolution" = "dependencies"
    "dispatcher" = "dispatch"
    "documentation-knowledge" = "docs"
    "domain-development" = "domain"
    "ecosystem-api-platform" = "api"
    "governance-configuration" = "governance"
    "infrastructure-platform" = "infra"
    "internationalization-localization" = "i18n"
    "legal-intellectual-property" = "legal"
    "legacy-migration-compatibility" = "migration"
    "mobile-cross-platform" = "mobile"
    "observability-sre" = "sre"
    "priority-calibration" = "prioritization"
    "product-and-requirements" = "product"
    "quality-testing" = "test"
    "research-tech-radar" = "research"
    "risk-assessment" = "risk"
    "security-compliance" = "security"
    "sustainability-green-computing" = "sustainability"
    "TASKS_MANAGER" = "config"
    "ux-ui-design-systems" = "design"
}

$rolesDir = "c:\newdev\ubos\agents\roles"
$sourceTasksDir = "c:\newdev\ubos\tasks"

function Filter-TaskFile {
    param(
        [string]$filePath,
        [string]$roleType,
        [string]$fileName
    )
    
    if (-not (Test-Path $filePath)) {
        return
    }
    
    $content = Get-Content -Path $filePath -Raw
    
    # For TASKS.md and TASK_INDEX.md, we'll handle differently
    if ($fileName -eq "TASKS.md") {
        # Keep TASKS.md as reference (don't filter)
        return
    }
    
    if ($fileName -eq "TASK_INDEX.md") {
        # Filter TASK_INDEX.md to show only tasks matching this role's type
        $lines = $content -split "`n"
        $filtered = @()
        $inEntry = $false
        $currentEntry = @()
        $includeEntry = $false
        
        foreach ($line in $lines) {
            if ($line -match "^## index_entry_begin") {
                $inEntry = $true
                $currentEntry = @($line)
                $includeEntry = $false
            }
            elseif ($line -match "^## index_entry_end") {
                $currentEntry += $line
                if ($includeEntry) {
                    $filtered += $currentEntry
                }
                $inEntry = $false
                $currentEntry = @()
            }
            elseif ($inEntry) {
                $currentEntry += $line
                if ($line -match "type:\s*$roleType") {
                    $includeEntry = $true
                }
            }
            else {
                # Keep headers and comments outside entries
                if (-not ($line -match "^\[id:" -or $line -match "^type:" -or $line -match "^priority:" -or $line -match "^component:" -or $line -match "^status:" -or $line -match "^location:" -or $line -match "^created:" -or $line -match "^title:")) {
                    $filtered += $line
                }
            }
        }
        
        $newContent = $filtered -join "`n"
        Set-Content -Path $filePath -Value $newContent -Encoding UTF8
        Write-Host "  Filtered $fileName (type: $roleType)"
        return
    }
    
    # For BACKLOG.md, TODO.md, ARCHIVE.md - filter task blocks by type
    $lines = $content -split "`n"
    $filtered = @()
    $inTaskBlock = $false
    $currentTask = @()
    $includeTask = $false
    
    foreach ($line in $lines) {
        if ($line -match "^## task_begin") {
            $inTaskBlock = $true
            $currentTask = @($line)
            $includeTask = $false
        }
        elseif ($line -match "^## task_end") {
            $currentTask += $line
            if ($includeTask) {
                $filtered += $currentTask
            }
            $inTaskBlock = $false
            $currentTask = @()
        }
        elseif ($inTaskBlock) {
            $currentTask += $line
            # Check if this task matches the role's type
            if ($line -match "\[type:$roleType\]") {
                $includeTask = $true
            }
        }
        else {
            # Keep headers, groups, and comments outside task blocks
            $filtered += $line
        }
    }
    
    $newContent = $filtered -join "`n"
    Set-Content -Path $filePath -Value $newContent -Encoding UTF8
    Write-Host "  Filtered $fileName (type: $roleType)"
}

# Process each role
foreach ($role in $roleTypeMap.Keys) {
    $roleFolder = Join-Path $rolesDir $role
    $taskFolder = Join-Path $roleFolder "tasks"
    $roleType = $roleTypeMap[$role]
    
    if (Test-Path $taskFolder) {
        Write-Host "Processing $role (type: $roleType)..."
        
        Filter-TaskFile -filePath (Join-Path $taskFolder "BACKLOG.md") -roleType $roleType -fileName "BACKLOG.md"
        Filter-TaskFile -filePath (Join-Path $taskFolder "TODO.md") -roleType $roleType -fileName "TODO.md"
        Filter-TaskFile -filePath (Join-Path $taskFolder "ARCHIVE.md") -roleType $roleType -fileName "ARCHIVE.md"
        Filter-TaskFile -filePath (Join-Path $taskFolder "TASK_INDEX.md") -roleType $roleType -fileName "TASK_INDEX.md"
    }
}

Write-Host "`nTask files filtered for all roles!"
