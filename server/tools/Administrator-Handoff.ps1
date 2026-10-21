param([ValidateSet('Save','Read','Show')][string]$Action)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$path=Join-Path $root 'server/.local/p21a/initial-administrator.credential.clixml'
if($Action -eq 'Save') {
  if(Test-Path -LiteralPath $path){throw 'Handoff exists; refusing replacement.'}
  $inputValue=[Console]::In.ReadToEnd() | ConvertFrom-Json
  $secure=ConvertTo-SecureString $inputValue.password -AsPlainText -Force
  $credential=[PSCredential]::new($inputValue.username,$secure)
  $credential | Export-Clixml -LiteralPath $path -NoClobber
  $inputValue=$null
  exit
}
$credential=Import-Clixml -LiteralPath $path
if((Get-Item -LiteralPath $path).LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-7)){throw 'Temporary handoff expired; no automatic account reset.'}
$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
try {
  if($Action -eq 'Read') {
    # Private child-process pipe only. Never invoke this mode in an interactive log.
    @{username=$credential.UserName;password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)} | ConvertTo-Json -Compress
  } elseif($Action -eq 'Show') {
    Add-Type -AssemblyName System.Windows.Forms
    $form=New-Object Windows.Forms.Form
    $form.Text='UPMS — private initial administrator handoff';$form.Width=620;$form.Height=285;$form.StartPosition='CenterScreen'
    $label=New-Object Windows.Forms.Label;$label.SetBounds(20,15,565,65)
    $label.Text="Open http://127.0.0.1:3000/management`r`nUsername: $($credential.UserName)`r`nChange this temporary password immediately after signing in."
    $field=New-Object Windows.Forms.TextBox;$field.SetBounds(20,90,565,30);$field.ReadOnly=$true;$field.UseSystemPasswordChar=$true
    $field.Text=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)
    $toggle=New-Object Windows.Forms.CheckBox;$toggle.SetBounds(20,130,350,25);$toggle.Text='Show temporary password on this screen'
    $toggle.Add_CheckedChanged({$field.UseSystemPasswordChar=-not $toggle.Checked})
    $close=New-Object Windows.Forms.Button;$close.SetBounds(420,175,160,30);$close.Text='Close private handoff';$close.Add_Click({$form.Close()})
    $form.Controls.AddRange(@($label,$field,$toggle,$close))
    [void]$form.ShowDialog();$field.Text='';$form.Dispose()
  }
} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer);$credential=$null}
