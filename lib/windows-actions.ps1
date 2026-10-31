$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try {
    $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -AsHashtable
    $value = [string]$request.value
    switch ($request.action) {
        'copy' {
            Set-Clipboard -Value $value
            if ((Get-Clipboard -Raw) -cne $value) { throw 'Clipboard verification failed.' }
            @{ ok = $true } | ConvertTo-Json -Compress
        }
        'folder' {
            if (-not (Test-Path -LiteralPath $value -PathType Container)) { throw 'The skill folder does not exist.' }
            $start = [System.Diagnostics.ProcessStartInfo]::new()
            $start.FileName = Join-Path $env:SystemRoot 'explorer.exe'
            $start.ArgumentList.Add($value)
            $start.UseShellExecute = $false
            $start.CreateNoWindow = $true
            [System.Diagnostics.Process]::Start($start) | Out-Null
            @{ ok = $true } | ConvertTo-Json -Compress
        }
        'browse' {
            $uri = [Uri]$value
            if ($uri.Scheme -notin @('http', 'https') -or $uri.UserInfo) { throw 'Only safe HTTP/HTTPS URLs can be opened.' }
            $start = [System.Diagnostics.ProcessStartInfo]::new()
            $start.FileName = $uri.AbsoluteUri
            $start.UseShellExecute = $true
            [System.Diagnostics.Process]::Start($start) | Out-Null
            @{ ok = $true } | ConvertTo-Json -Compress
        }
        'choose-project' {
            Add-Type -AssemblyName System.Windows.Forms
            $dialog = [System.Windows.Forms.FolderBrowserDialog]::new()
            $dialog.Description = 'Choose a local project folder'
            $dialog.UseDescriptionForTitle = $true
            $dialog.ShowNewFolderButton = $false
            $selected = $null
            if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                $selected = $dialog.SelectedPath
            }
            $dialog.Dispose()
            @{ ok = $true; path = $selected } | ConvertTo-Json -Compress
        }
        default { throw 'Unknown desktop action.' }
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
