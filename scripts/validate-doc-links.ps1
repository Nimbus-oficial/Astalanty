$ErrorActionPreference = "Stop"

$root = Join-Path (Get-Location) "Astalanty contexto Obsidian"

if (-not (Test-Path -LiteralPath $root)) {
  Write-Host "Obsidian vault not present. Skipping vault wikilink validation."
  exit 0
}

$files = @(Get-ChildItem -Path $root -Recurse -File -Filter "*.md")
$baseToFiles = @{}

foreach ($file in $files) {
  $base = [IO.Path]::GetFileNameWithoutExtension($file.FullName)
  if (-not $baseToFiles.ContainsKey($base)) {
    $baseToFiles[$base] = @()
  }
  $baseToFiles[$base] += $file.FullName
}

$broken = @()

foreach ($file in $files) {
  $text = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
  foreach ($match in [regex]::Matches($text, "\[\[([^\]]+)\]\]")) {
    $raw = $match.Groups[1].Value
    $target = (($raw -split "\|")[0] -split "#")[0].Trim()

    if ($target -eq "") {
      continue
    }

    $ok = $false

    if ($target -match "[\\/]") {
      $pathTarget = $target -replace "/", "\"
      $full = Join-Path $root ($pathTarget + ".md")
      $ok = Test-Path -LiteralPath $full
    } else {
      $ok = $baseToFiles.ContainsKey($target)
    }

    if (-not $ok) {
      $broken += [pscustomobject]@{
        File = $file.FullName.Substring($root.Length + 1)
        Target = $target
      }
    }
  }
}

if ($broken.Count -gt 0) {
  $broken | Format-Table -AutoSize
  Write-Error "Broken Obsidian links found: $($broken.Count)"
}

Write-Host "Obsidian links OK. Files: $($files.Count)"
