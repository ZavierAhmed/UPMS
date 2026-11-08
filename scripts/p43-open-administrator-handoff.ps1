[CmdletBinding()]
param([ValidateSet('admin','haris')][string]$User='admin',[switch]$Show)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$path=Join-Path $repo 'tmp/protected-offhost-backups/p43-stage-recovery/production-administrator-handoff.dpapi'
if(!(Test-Path -LiteralPath $path)){throw 'PROTECTED_ADMINISTRATOR_HANDOFF_MISSING'}
if(!$Show){
 @{prepared=$true;user=$User;schema='upms_v2';ownerReceipt='PENDING';firstPasswordRotation='PENDING';liveBindingUnchanged=$true;secretsPrinted=$false}|ConvertTo-Json
 return
}
# Owner-run only. No console password output, clipboard operation, login or credential reset.
Add-Type -AssemblyName System.Windows.Forms
$bytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($path),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$form=$null;$values=$null
try{
 $values=[Text.Encoding]::UTF8.GetString($bytes)|ConvertFrom-Json
 $form=[Windows.Forms.Form]::new();$form.Text='UPMS private administrator handoff';$form.Width=630;$form.Height=270;$form.StartPosition='CenterScreen'
 $notice=[Windows.Forms.Label]::new();$notice.Text="New upms_v2 installation only. The current live management binding is unchanged.`r`nDo not enter this password into the previous installation. Owner rotation is pending.";$notice.Left=15;$notice.Top=15;$notice.Width=580;$notice.Height=48
 $label=[Windows.Forms.Label]::new();$label.Text="Username: $User — initial password (masked)";$label.Left=15;$label.Top=78;$label.Width=580
 $password=[Windows.Forms.TextBox]::new();$password.Left=15;$password.Top=104;$password.Width=580;$password.ReadOnly=$true;$password.UseSystemPasswordChar=$true;$password.Text=$values.$User
 $reveal=[Windows.Forms.CheckBox]::new();$reveal.Text='Reveal on this private screen';$reveal.Left=15;$reveal.Top=145;$reveal.Width=300;$reveal.Add_CheckedChanged({$password.UseSystemPasswordChar=!$reveal.Checked})
 $close=[Windows.Forms.Button]::new();$close.Text='Close';$close.Left=495;$close.Top=175;$close.Add_Click({$form.Close()})
 $form.Controls.AddRange(@($notice,$label,$password,$reveal,$close));[void]$form.ShowDialog()
 $password.Clear()
}finally{if($form){$form.Dispose()};$values=$null;[Array]::Clear($bytes,0,$bytes.Length)}
