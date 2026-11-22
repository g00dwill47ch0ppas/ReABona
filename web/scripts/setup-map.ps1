param([string] $ArchivePath = '')

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$mapDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\maps'
$mapFile = Join-Path $mapDirectory 'south-africa.pmtiles'
$temporaryArchive = Join-Path ([System.IO.Path]::GetTempPath()) ("reabona-map-{0}.zip" -f [guid]::NewGuid())
$downloadedArchive = $false
New-Item -ItemType Directory -Force -Path $mapDirectory | Out-Null

try {
    if (-not (Test-Path -LiteralPath $mapFile)) {
        if (-not $ArchivePath) {
            Write-Host 'Downloading the South Africa basemap (approximately 346 MB)...'
            $downloadedArchive = $true
            Invoke-WebRequest -UseBasicParsing -Uri 'https://data.bbbike.org/osm/pmtiles/region/africa/south-africa/south-africa.osm.pmtiles-shortbread.zip' -OutFile $temporaryArchive
            $ArchivePath = $temporaryArchive
        }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ArchivePath).Path)
        $temporaryMap = "$mapFile.download"
        try {
            $entries = @($archive.Entries | Where-Object { $_.FullName -match '\.pmtiles$' })
            if ($entries.Count -ne 1 -or $entries[0].Length -le 127 -or $entries[0].Length -gt 2GB) {
                throw 'The downloaded map archive does not contain one valid-sized PMTiles file.'
            }
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0], $temporaryMap, $true)
            $stream = [System.IO.File]::OpenRead($temporaryMap)
            try {
                $header = New-Object byte[] 7
                if ($stream.Read($header, 0, 7) -ne 7 -or [System.Text.Encoding]::ASCII.GetString($header) -ne 'PMTiles') {
                    throw 'The downloaded map is not a PMTiles file.'
                }
            } finally { $stream.Dispose() }
            Move-Item -LiteralPath $temporaryMap -Destination $mapFile
        } finally {
            $archive.Dispose()
            if (Test-Path -LiteralPath $temporaryMap) { Remove-Item -LiteralPath $temporaryMap }
        }
    }

    $fontDirectory = Join-Path $mapDirectory 'fonts\Open Sans Semibold'
    New-Item -ItemType Directory -Force -Path $fontDirectory | Out-Null
    foreach ($start in (0..15 | ForEach-Object { $_ * 256 })) {
        $range = "$start-$($start + 255)"
        $fontFile = Join-Path $fontDirectory "$range.pbf"
        if (-not (Test-Path -LiteralPath $fontFile)) {
            $temporaryFont = "$fontFile.download"
            try {
                Invoke-WebRequest -UseBasicParsing -Uri "https://demotiles.maplibre.org/font/Open%20Sans%20Semibold/$range.pbf" -OutFile $temporaryFont
                if ((Get-Item -LiteralPath $temporaryFont).Length -eq 0) { throw "Empty map font: $range" }
                Move-Item -LiteralPath $temporaryFont -Destination $fontFile
            } finally {
                if (Test-Path -LiteralPath $temporaryFont) { Remove-Item -LiteralPath $temporaryFont }
            }
            $fontLicense = Join-Path $fontDirectory 'OFL.txt'
            if (-not (Test-Path -LiteralPath $fontLicense)) {
                Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OFL.txt' -OutFile $fontLicense
            }
            $distributionLicense = Join-Path $fontDirectory 'MAPLIBRE-LICENSE.txt'
            if (-not (Test-Path -LiteralPath $distributionLicense)) {
                Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/maplibre/demotiles/gh-pages/LICENSE' -OutFile $distributionLicense
            }
        }
    }
    Write-Host 'Offline South Africa map is ready.'
} finally {
    if ($downloadedArchive -and (Test-Path -LiteralPath $temporaryArchive)) { Remove-Item -LiteralPath $temporaryArchive }
}
