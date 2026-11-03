param()
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$binding=Join-Path $repo 'tmp/php-runtime/uath1-owner-binding.json'
if(-not(Test-Path -LiteralPath $binding)){
    Write-Host 'Creates a NEW isolated synthetic Employee Hafta UAT database. Existing owner UAT stays unchanged.'
    $secure=Read-Host 'Choose a strong password for the NEW synthetic php-admin account (14+ characters)' -AsSecureString
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try{
        $password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        if($password.Length -lt 14){throw 'Use at least 14 characters for this isolated UAT password.'}
        $info=[Diagnostics.ProcessStartInfo]::new()
        $info.FileName=(Get-Command node).Source
        $info.ArgumentList.Add('scripts/uath1-integration.mjs')
        $info.ArgumentList.Add('--owner-password-stdin')
        $info.WorkingDirectory=$repo
        $info.UseShellExecute=$false
        $info.CreateNoWindow=$true
        $info.RedirectStandardInput=$true
        $process=[Diagnostics.Process]::Start($info)
        $process.StandardInput.WriteLine((@{password=$password}|ConvertTo-Json -Compress))
        $process.StandardInput.Close()
        $password=$null
        $process.WaitForExit()
        if($process.ExitCode -ne 0){throw 'Isolated setup/acceptance failed; no owner binding was changed. See the failed stage.'}
        Copy-Item -LiteralPath (Join-Path $repo 'tmp/php-runtime/uath1-latest.json') -Destination $binding
    }finally{
        $password=$null
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secure.Dispose()
    }
}
# Subsequent starts reuse the fixed owner-selected synthetic binding and its records.
Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/uath1-preview.mjs' -WorkingDirectory $repo -WindowStyle Hidden
Write-Host 'Employee Hafta UAT: http://127.0.0.1:5180/management (synthetic php-admin account).'
Write-Host 'Original owner UAT remains at http://127.0.0.1:5173/management with its existing credentials and records.'
