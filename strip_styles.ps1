$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $original = $content
        
        # 1. Remove the Internal CSS Block
        # Using dots (.) to match accented characters to avoid encoding issues in the script execution
        # Pattern matches /* --- CORRECCI..N ... */ until the end of the media query block
        $cssPattern = "(?s)\/\* --- CORRECCI..N MEN. QUIR.RGICA PARA M.VILES --- \*\/.*?\}\s*\}\s*(?=<\/style>)"
        
        if ($content -match $cssPattern) {
            $content = $content -replace $cssPattern, ""
            Write-Host "Removed CSS block from $($file.Name)"
        }

        # 2. Fix the Menu Toggle Structure (Replace spans with icon)
        # Pattern looks for the 3 spans used in the internal blog.html version
        $spanPattern = '(?s)<span class="bar"><\/span>\s*<span class="bar"><\/span>\s*<span class="bar"><\/span>'
        
        if ($content -match $spanPattern) {
            $content = $content -replace $spanPattern, '<i class="fas fa-bars"></i>'
            Write-Host "Fixed menu icon structure in $($file.Name)"
        }

        # Save only if changed
        if ($content -ne $original) {
            Set-Content $file.FullName $content -Encoding UTF8
        }
    } catch {
        Write-Host "Error processing $($file.Name): $_"
    }
}
