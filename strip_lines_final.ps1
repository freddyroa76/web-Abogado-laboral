$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    $lines = Get-Content $file.FullName -Force
    # Force read, let PS handle encoding guess or default
    
    $newLines = @()
    $skipping = $false
    $dirty = $false
    $iconFixed = $false

    foreach ($line in $lines) {
        # Broad match for the start of the CSS block
        # Matches "CORRECCI" followed eventually by "VILES" (Móviles/Moviles)
        # Using -match with regex "." to skip accents
        if ($line -match "CORRECCI.*VILES") {
            $skipping = $true
            $dirty = $true
            Write-Host "Dropping CSS block in $($file.Name)"
            continue
        }
        
        if ($skipping) {
            # Looking for the end of the block: the closing style tag </style>
            # The block we want to remove is INSIDE style tags, usually at the end.
            # Only stop skipping if we hit </style>
            if ($line -match "<\/style>") {
                $skipping = $false
                # We KEEP the </style> line
                $newLines += $line
            }
            # Else we skip (drop) the line
        }
        else {
            # Check for spans to replace (Icon fix)
            if ($line -match '<span class="bar"><\/span>' -or $line -match '<span class="bar"></span>') {
                # If we find a line with spans, we likely want to replace the whole block or just that line
                # But the spans might be on multiple lines.
                # Simplest fix: If line creates a bar, just drop it. 
                # AND ensure we inject the <i> icon content once.
                
                # However, removing them leaves the container empty.
                # Better: Check if we haven't injected the icon yet for this file/section
                if (-not $iconFixed) {
                   # Replace this line with the icon
                   $newLines += '          <i class="fas fa-bars"></i>'
                   $iconFixed = $true
                   $dirty = $true
                   Write-Host "Injected icon in $($file.Name)"
                }
                # If we already injected, just drop subsequent span lines (the other 2)
            }
            else {
                $newLines += $line
            }
        }
    }

    if ($dirty) {
        $newContent = $newLines -join "`n"
        Set-Content $file.FullName $newContent -Encoding UTF8
        Write-Host "Saved Cleaned $($file.Name)"
    }
}
