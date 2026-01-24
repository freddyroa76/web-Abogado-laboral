$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    $lines = Get-Content $file.FullName -Encoding UTF8
    $newLines = @()
    $skipping = $false
    $dirty = $false

    foreach ($line in $lines) {
        # Check for start of the block (ignore encoding issues by matching reliable parts)
        if ($line -match "CORRECCI" -and $line -match "MENU" -and $line -match "MOVILES") {
            $skipping = $true
            $dirty = $true
            Write-Host "Found block start in $($file.Name)"
        }
        
        if ($skipping) {
            # Check for end of block (the closing style tag)
            if ($line -match "<\/style>") {
                $skipping = $false
                $newLines += $line # Keep the closing style tag
            }
            # Else: skip this line
        }
        else {
            $newLines += $line
        }
    }

    if ($dirty) {
        $newContent = $newLines -join "`n"
        # Since I am overwriting, ensure I didn't lose the whole file if match failed
        if ($newLines.Count -gt 10) {
             # Fix the Icon Structure (Regex on the full content is still useful here or we could have done it line by line)
             # But let's do it on the joined content for multiline span matching
             
             $spanPattern = '(?s)<span class="bar"><\/span>\s*<span class="bar"><\/span>\s*<span class="bar"><\/span>'
             if ($newContent -match $spanPattern) {
                 $newContent = $newContent -replace $spanPattern, '<i class="fas fa-bars"></i>'
                 Write-Host "Fixed menu icon in $($file.Name)"
             }
             
             Set-Content $file.FullName $newContent -Encoding UTF8
             Write-Host "Saved Cleaned $($file.Name)"
        }
    }
}
