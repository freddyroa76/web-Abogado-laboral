$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    $lines = Get-Content $file.FullName -Force
    $newLines = @()
    $dirty = $false
    $iconFixed = $false

    foreach ($line in $lines) {
        if ($line -match 'class="bar"') {
            # Found a span bar.
            if (-not $iconFixed) {
                # Replace with the FA icon
                # Preserve indentation if possible, or just use standard
                $newLines += '          <i class="fas fa-bars"></i>'
                $iconFixed = $true
                $dirty = $true
                Write-Host "Replaced span with icon in $($file.Name)"
            }
            # Else: Drop subsequent bar lines (we only need one icon)
        }
        else {
            $newLines += $line
        }
    }

    if ($dirty) {
        $newContent = $newLines -join "`n"
        Set-Content $file.FullName $newContent -Encoding UTF8
        Write-Host "Saved matched file $($file.Name)"
    }
}
