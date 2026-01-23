$files = @(
    @{ Path="herramienta-calculadora-nomina-maestra.html"; CutStart=54; CutEnd=97 },
    @{ Path="herramienta-cesantias.html"; CutStart=307; CutEnd=601 },
    @{ Path="herramienta-horas-extras.html"; CutStart=61; CutEnd=111 },
    @{ Path="herramienta-incapacidades.html"; CutStart=68; CutEnd=124 }
)

$baseDir = "c:\Users\Usuario\OneDrive - SALGADO MELENDEZ Y ASOCIADOS INGENEIROS CONSULTORES SA\Documentos\web-Abogado-laboral"

foreach ($f in $files) {
    try {
        $fullPath = Join-Path $baseDir $f.Path
        Write-Host "Processing $fullPath (Removing lines $($f.CutStart)-$($f.CutEnd))"
        $lines = Get-Content $fullPath
        
        # PowerSehll array slicing.
        # We want to keep 0..(Start-2)
        # And (End)..(Count-1)
        
        $idxBefore = $f.CutStart - 2
        $idxAfter = $f.CutEnd
        
        $part1 = $lines[0..$idxBefore]
        $part2 = $lines[$idxAfter..($lines.Count - 1)]
        
        $newContent = $part1 + $part2
        $newContent | Set-Content $fullPath -Encoding UTF8
        Write-Host "Fixed $($f.Path)"
    } catch {
        Write-Error "Failed to process $($f.Path): $_"
    }
}
