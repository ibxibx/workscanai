Start-Sleep -Seconds 90
Write-Output "Backfilling workflows..."
# Admin secret comes from the environment — never hardcode it.
# Set it first:  $env:WSAI_ADMIN_SECRET = "<your ADMIN_SECRET>"
if (-not $env:WSAI_ADMIN_SECRET) { Write-Error "Set `$env:WSAI_ADMIN_SECRET first"; exit 1 }
$headers = @{"x-admin-secret"=$env:WSAI_ADMIN_SECRET; "Content-Type"="application/json"}
foreach ($id in @(65, 70, 71, 72, 73, 74, 75)) {
    try {
        $r = Invoke-WebRequest "https://workscanai.onrender.com/api/admin/backfill-n8n/$id" -Method POST -Headers $headers -UseBasicParsing -TimeoutSec 30
        $j = $r.Content | ConvertFrom-Json
        Write-Output "wf ${id} OK - $($j.message)"
    } catch {
        Write-Output "wf ${id} ERR - $($_.Exception.Message)"
    }
}
Write-Output "Done"
