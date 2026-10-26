# Execute localmente uma vez, em ambiente autenticado. Nunca imprime segredos.
param([string]$GithubCli = 'gh')
$ErrorActionPreference = 'Stop'
$team = 'igorcastro1010-8396s-projects'
$repo = 'igorcastro1010/radar-frete-antt'
$secret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$credential = "protocol=https`nhost=github.com`n`n" | git credential fill
$password = $credential | Where-Object { $_ -like 'password=*' }
if (-not $password) { throw 'Autentique o GitHub no Git Credential Manager.' }
try {
  $env:GH_TOKEN = $password.Substring(9)
  $secret | & $GithubCli secret set CRON_SECRET --repo $repo
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar segredo no repositório novo.' }
  $secret | npx --yes vercel@65.2.0 env add CRON_SECRET production --scope $team --sensitive
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar CRON_SECRET na produção.' }
  'https://radar-frete-antt.vercel.app' | npx --yes vercel@65.2.0 env add APP_ORIGIN production --scope $team
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar origem.' }
  'github-actions' | npx --yes vercel@65.2.0 env add SCHEDULER_MODE production --scope $team
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar modo de agenda.' }
  # Ambiente local continua separado da origem de produção.
  Add-Content -LiteralPath '.env.local' -Value "`nCRON_SECRET=$secret`nAPP_ORIGIN=http://localhost:3000`nSCHEDULER_MODE=github-actions"
  Write-Output 'Segredo exclusivo criado no GitHub e na Vercel; origem e agenda configuradas.'
} finally {
  Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
  Remove-Variable credential,password,secret -ErrorAction SilentlyContinue
}
