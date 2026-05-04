# Build output uploader for the static S3 website.

param(
    [string]$BucketName = "tensionretro-web-520209747932-us-east-2",
    [string]$Region = "us-east-2",
    [string]$Profile = "default",
    [string]$DistPath = "..\frontend\web-admin\dist"
)

if (-not (Test-Path $DistPath)) {
    Write-Error "Build output not found at $DistPath. Run npm run build first."
    exit 1
}

$fileCount = @(Get-ChildItem $DistPath -Recurse -File).Count
Write-Host "Uploading $fileCount files to s3://$BucketName"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

aws s3 sync $DistPath `
    "s3://$BucketName" `
    --region $Region `
    --profile $Profile `
    --delete `
    --cache-control "max-age=3600"

$stopwatch.Stop()

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed. Check AWS credentials, S3 permissions, bucket name, and region."
    exit 1
}

Write-Host "Upload completed in $($stopwatch.Elapsed.TotalSeconds)s"
Write-Host "Website URL: http://$BucketName.s3-website.$Region.amazonaws.com"
