$files = @(
    @{ Path="herramienta-prima.html"; CutStart=303; CutEnd=593 },
    @{ Path="herramienta-retefuente.html"; CutStart=295; CutEnd=578 },
    @{ Path="herramienta-vacaciones.html"; CutStart=286; CutEnd=559 },
    @{ Path="herramienta-nomina-empleador.html"; CutStart=313; CutEnd=612 }
)

$baseDir = "c:\Users\Usuario\OneDrive - SALGADO MELENDEZ Y ASOCIADOS INGENEIROS CONSULTORES SA\Documentos\web-Abogado-laboral"

foreach ($f in $files) {
    try {
        $fullPath = Join-Path $baseDir $f.Path
        Write-Host "Processing $fullPath (Removing lines $($f.CutStart)-$($f.CutEnd))"
        $lines = Get-Content $fullPath
        
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
