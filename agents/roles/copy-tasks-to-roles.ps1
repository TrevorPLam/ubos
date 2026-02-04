# Copy tasks folder to each role folder
# This script copies the tasks directory from c:\newdev\ubos\tasks into every role folder

$sourceTasksDir = "c:\newdev\ubos\tasks"
$rolesDir = "c:\newdev\ubos\agents\roles"

# Get all role folders (only directories)
$roleFolders = Get-ChildItem -Path $rolesDir -Directory

foreach ($roleFolder in $roleFolders) {
    $destTasksDir = Join-Path $roleFolder.FullName "tasks"
    
    # Create the tasks directory if it doesn't exist
    if (-not (Test-Path $destTasksDir)) {
        New-Item -ItemType Directory -Path $destTasksDir | Out-Null
        Write-Host "Created tasks folder: $destTasksDir"
    }
    
    # Copy all files from source tasks to destination
    Get-ChildItem -Path $sourceTasksDir -File | ForEach-Object {
        $destFile = Join-Path $destTasksDir $_.Name
        Copy-Item -Path $_.FullName -Destination $destFile -Force
        Write-Host "  Copied $($_.Name)"
    }
}

Write-Host "`nTask folders created and populated for all roles!"
