# Opens each Vyaha mobile app in its own terminal with a QR code (no browser).
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

$apps = @(
    @{ Title = "Vyaha Customer"; Path = "customer-app"; Port = 8081; Args = "" },
    @{ Title = "Vyaha Partner";  Path = "partner-app";  Port = 8082; Args = "--dev-client" },
    @{ Title = "Vyaha Delivery"; Path = "delivery-app"; Port = 8083; Args = "--dev-client" }
)

foreach ($app in $apps) {
    $dir = Join-Path $root "apps\$($app.Path)"
    $expoArgs = "start --port $($app.Port)"
    if ($app.Args) {
        $expoArgs += " $($app.Args)"
    }

    $psCommand = @"
`$Host.UI.RawUI.WindowTitle = '$($app.Title)'
Set-Location '$dir'
`$env:EXPO_NO_TELEMETRY = '1'
`$env:CI = '1'
npx expo $expoArgs
"@

    Start-Process $shell -ArgumentList @("-NoExit", "-NoProfile", "-Command", $psCommand)
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "Started 3 Expo dev servers in separate terminals:"
Write-Host "  Customer  -> port 8081"
Write-Host "  Partner   -> port 8082 (dev client)"
Write-Host "  Delivery  -> port 8083 (dev client)"
Write-Host ""
Write-Host "To stop them: npm run stop:apps"
