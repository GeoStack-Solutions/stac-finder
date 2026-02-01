# Wrapper for docker-compose - load API_PORT from api/.env
$envFile = "api\.env"
$defaultPort = "4000"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^API_PORT=(.*)$') {
            $env:API_PORT = $matches[1].Trim()
        }
        if ($_ -match '^API_HOST=(.*)$') {
            $env:API_HOST = $matches[1].Trim()
        }
    }
}

if (-not $env:API_PORT) {
    $env:API_PORT = $defaultPort
}

Write-Host "Using API_PORT=$env:API_PORT from $envFile" -ForegroundColor Green
docker-compose $args
