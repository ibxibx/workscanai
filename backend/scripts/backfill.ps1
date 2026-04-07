Start-Sleep -Seconds 90
Write-Output "Backfilling workflows..."
$headers = @{"x-admin-secret"="AKF6uTJalPohB4dtymnEiwZrLDRqSWkc"; "Content-Type"="application/json"}
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
