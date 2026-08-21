#Requires -Version 5.1
<#
.SYNOPSIS
  Aufgabenlaeufer dieses Repos (PowerShell, kein GNU make noetig).

.DESCRIPTION
  Ein Weg fuer alles, was an diesem Frontend geprueft wird: formatieren, linten,
  Komplexitaet messen, Typen pruefen, Vertraege erzeugen. Die Ziele spiegeln die
  Befehle aus CLAUDE.md; die einzelnen Schritte stehen als Skripte in
  package.json und werden von hier aufgerufen, nicht nachgebaut.

  Dieses Repo ist der Consumer. Es schreibt seine Vertraege nach ./pacts und ist
  damit fertig - es startet keinen Provider, ruft keinen auf und weiss nichts
  ueber ihn. Verifiziert wird im Provider-Repo.

  Node liegt auf dieser Maschine nicht im PATH; das Skript sucht es selbst.

.EXAMPLE
  ./make.ps1 ci
  ./make.ps1 lint format-check
  ./make.ps1 test
#>
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Targets
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# Pact meldet sonst Version und Betriebssystem nach aussen.
$env:PACT_DO_NOT_TRACK = 'true'

function Invoke-Step {
    <#
      Fuehrt einen Schritt aus und entscheidet allein am Exit-Code.

      Waehrend des Aufrufs steht ErrorActionPreference bewusst auf 'Continue':
      npm, jest und eslint schreiben Hinweise nach stderr, und PowerShell 5.1
      macht daraus - sobald die Ausgabe umgeleitet wird - einen
      NativeCommandError, der den Lauf sonst mitten im gruenen Schritt abbricht.
    #>
    param([string]$Name, [scriptblock]$Action)
    Write-Host "==> $Name" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    $before = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Action } finally { $ErrorActionPreference = $before }
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        throw "Ziel '$Name' fehlgeschlagen mit Exit-Code $LASTEXITCODE"
    }
}

function Use-Node {
    <#
      Legt Node in den PATH dieses Prozesses, egal wo es installiert ist, und
      raeumt eine ins Leere zeigende NODE_EXTRA_CA_CERTS weg: hinter einem
      TLS-aufbrechenden Proxy scheitert npm sonst mit
      SELF_SIGNED_CERT_IN_CHAIN, und zwar erst nach langem Warten.
    #>
    if ($env:NODE_EXTRA_CA_CERTS -and -not (Test-Path $env:NODE_EXTRA_CA_CERTS)) {
        Write-Host "NODE_EXTRA_CA_CERTS zeigt auf '$env:NODE_EXTRA_CA_CERTS' - Datei fehlt." -ForegroundColor Yellow
        $fromUser = [Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS', 'User')
        if ($fromUser -and (Test-Path $fromUser)) {
            $env:NODE_EXTRA_CA_CERTS = $fromUser
            Write-Host "Ersetzt durch die Nutzer-Einstellung: $fromUser" -ForegroundColor Yellow
        } else {
            Remove-Item Env:\NODE_EXTRA_CA_CERTS
            $env:NODE_OPTIONS = ("$env:NODE_OPTIONS --use-system-ca").Trim()
            Write-Host 'Fallback auf den Zertifikatsspeicher des Systems (--use-system-ca).' -ForegroundColor Yellow
        }
    }

    if (Get-Command node -ErrorAction SilentlyContinue) { return }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\nodejs'),
        (Join-Path $env:ProgramFiles 'nodejs'),
        'C:\nodejs'
    )
    foreach ($dir in $candidates) {
        if (Test-Path (Join-Path $dir 'node.exe')) {
            $env:Path = "$dir;$env:Path"
            return
        }
    }
    throw 'node.exe nicht gefunden - Node installieren oder in den PATH legen.'
}

$targetTable = [ordered]@{

    'help' = @{
        Description = 'Ziele auflisten (Standard, wenn keines angegeben ist)'
        Action      = {
            Write-Host "Ziele:`n"
            foreach ($key in $targetTable.Keys) {
                '{0,-14} {1}' -f $key, $targetTable[$key].Description
            }
        }
    }

    'install' = @{
        Description = 'Abhaengigkeiten aus package-lock.json installieren'
        Action      = { Use-Node; Invoke-Step 'install' { npm install --no-audit --no-fund } }
    }

    'format' = @{
        Description = 'Quelltext formatieren (Prettier, schreibend)'
        Action      = { Use-Node; Invoke-Step 'format' { npm run format } }
    }

    'format-check' = @{
        Description = 'Formatierung pruefen, ohne zu aendern'
        Action      = { Use-Node; Invoke-Step 'format-check' { npm run format-check } }
    }

    'lint' = @{
        Description = 'Lint (ESLint)'
        Action      = { Use-Node; Invoke-Step 'lint' { npm run lint } }
    }

    'complexity' = @{
        # Eigener Lauf mit eigener Konfiguration: Lint sagt "das ist falsch",
        # Komplexitaet sagt "das ist zu viel auf einmal". Wer das eine abstellt,
        # um das andere loszuwerden, haette sonst leichtes Spiel.
        Description = 'Komplexitaet messen (ESLint, eigene Konfiguration)'
        Action      = { Use-Node; Invoke-Step 'complexity' { npm run complexity } }
    }

    'typecheck' = @{
        Description = 'Typen pruefen, ohne zu uebersetzen'
        Action      = { Use-Node; Invoke-Step 'typecheck' { npm run typecheck } }
    }

    'test' = @{
        Description = 'Tests fahren; schreibt ./pacts/*.json'
        Action      = {
            Use-Node
            # Pact ergaenzt eine bestehende Datei, statt sie zu ersetzen. Ohne
            # Leeren bliebe eine geloeschte Interaktion im Vertrag stehen und
            # der Diff loege.
            $pacts = Join-Path $PSScriptRoot 'pacts'
            if (Test-Path $pacts) { Remove-Item "$pacts\*.json" -Force }
            Invoke-Step 'test' { npm test }
        }
    }

    'ci' = @{
        Description = 'lint + format-check + typecheck + complexity + test, in dieser Reihenfolge'
        Action      = {
            Invoke-Target 'lint'
            Invoke-Target 'format-check'
            Invoke-Target 'typecheck'
            Invoke-Target 'complexity'
            Invoke-Target 'test'
        }
    }

    'all' = @{
        # Nur ein Alias - 'all' ist der Name, nach dem man aus Gewohnheit greift.
        # Reine Weiterleitung, damit die beiden nie auseinanderlaufen.
        Description = 'Alias fuer ci'
        Action      = { Invoke-Target 'ci' }
    }
}

function Invoke-Target {
    param([string]$Name)
    if (-not $targetTable.Contains($Name)) {
        Write-Error "Unbekanntes Ziel '$Name'. './make.ps1 help' listet die vorhandenen."
        exit 1
    }
    & $targetTable[$Name].Action
}

if (-not $Targets -or $Targets.Count -eq 0) { $Targets = @('help') }

foreach ($t in $Targets) {
    Invoke-Target $t
}
