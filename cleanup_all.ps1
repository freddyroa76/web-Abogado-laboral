$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $original = $content
        
        # PATTERN A: Found in blog.html ("CORRECCIONES MÓVILES")
        $pA = "(?s)\/\* =+.*?CORRECCIONES M.VILES.*?\}\s*\}\s*(?=<\/style>)"
        if ($content -match $pA) {
            $content = $content -replace $pA, ""
            Write-Host "Removed CSS (Type A) from $($file.Name)"
        }

        # PATTERN B: Found in herramientas (*.html) ("CORRECCIÓN MENÚ...")
        # Note the aggressive wildcards to catch any variation of text between comments
        $pB = "(?s)\/\* --- CORRECCI.*?MENU.*?MOVILES --- \*\/.*?\}\s*\}\s*(?=<\/style>)"
        if ($content -match $pB) {
            $content = $content -replace $pB, ""
            Write-Host "Removed CSS (Type B) from $($file.Name)"
        }

        # ICON REPLACEMENT
        # Aggressive regex to catch the 3 spans regardless of subtle whitespace
        $spanPattern = '(?s)(<span class="bar"><\/span>\s*){3}'
        # Alternative if the spans have attributes or spaces
        $spanPatternLoose = '(?s)<span class="bar"[^>]*><\/span>\s*<span class="bar"[^>]*><\/span>\s*<span class="bar"[^>]*><\/span>'
        
        if ($content -match $spanPatternLoose) {
            $content = $content -replace $spanPatternLoose, '<i class="fas fa-bars"></i>'
            Write-Host "Fixed Icon (Loose) in $($file.Name)"
        } elseif ($content -match $spanPattern) {
            $content = $content -replace $spanPattern, '<i class="fas fa-bars"></i>'
            Write-Host "Fixed Icon (Strict) in $($file.Name)"
        }

        if ($content -ne $original) {
            Set-Content $file.FullName $content -Encoding UTF8
        }
    } catch {
        Write-Host "Error processing $($file.Name): $_"
    }
}
