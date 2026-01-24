$files = Get-ChildItem -Path . -Filter "*.html" -Recurse

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $original = $content
        
        # 1. Remove the Internal CSS Block ("CORRECCIONES MÓVILES")
        # Pattern: Matches the comment header and the following media query block
        # From: /* ... CORRECCIONES ... */ ... @media ... }
        # The block ends right before </style>
        
        # We construct a regex that consumes from the comment to the end of the @media block
        # Note: We use . (dot) for accented chars to be safe.
        $cssPattern = "(?s)\/\* =+.*?CORRECCIONES M.VILES.*?\}\s*\}\s*(?=<\/style>)"
        
        if ($content -match $cssPattern) {
            $content = $content -replace $cssPattern, ""
            Write-Host "Removed CSS block from $($file.Name)"
        }

        # 2. Fix the Menu Toggle Structure (Replace spans with icon)
        # Matches the specific 3-span structure used in the internal template
        $spanPattern = '(?s)<span class="bar"><\/span>\s*<span class="bar"><\/span>\s*<span class="bar"><\/span>'
        
        # The blog.html spans didn't have classes in my regex?
        # Step 87: <span class="bar"></span>
        # My regex above uses class="bar". It should match.
        # Wait, Step 87 uses:
        # <div ... class="menu-toggle" ...>
        #   <span class="bar"></span>
        #   <span class="bar"></span>
        #   <span class="bar"></span>
        # </div>
        
        if ($content -match $spanPattern) {
            $content = $content -replace $spanPattern, '<i class="fas fa-bars"></i>'
            Write-Host "Fixed menu icon in $($file.Name)"
        }
        
        # Also fix simpler case if spans are on one line or slightly different spacing
        $spanPattern2 = '(?s)<span class="bar"></span>\s*<span class="bar"></span>\s*<span class="bar"></span>'
         if ($content -match $spanPattern2) {
            $content = $content -replace $spanPattern2, '<i class="fas fa-bars"></i>'
            Write-Host "Fixed menu icon (var 2) in $($file.Name)"
        }

        if ($content -ne $original) {
            Set-Content $file.FullName $content -Encoding UTF8
        }
    } catch {
        Write-Host "Error processing $($file.Name): $_"
    }
}
