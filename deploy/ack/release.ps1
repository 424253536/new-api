#Requires -Version 7.0
<#
.SYNOPSIS
    构建、推送并把 new-api 发布到阿里云 ACK（SQLite 单副本）。

.DESCRIPTION
    流程：前端类型检查 -> 用 Tag 覆写 VERSION -> docker build(linux/amd64)
    -> 容器冒烟（校验 /api/status 版本号）-> docker push
    -> 更新 kustomization 的 newTag -> kubectl apply -k -> 等待 rollout。
    构建结束后会把 VERSION 恢复原状。

.EXAMPLE
    ./release.ps1 -Tag prod-v1.0.0

.EXAMPLE
    ./release.ps1 -Tag prod-v1.0.1 -SkipPush -SkipDeploy

.EXAMPLE
    ./release.ps1 -Tag prod-v1.0.2 -DryRun
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Tag,
    [string]$Registry = 'registry.cn-shanghai.aliyuncs.com',
    [string]$Repository = 'zhike/new-api',
    [string]$Namespace = 'new-api',
    [string]$DeploymentName = 'new-api',
    [switch]$SkipBuildCheck,
    [switch]$SkipSmoke,
    [switch]$SkipPush,
    [switch]$SkipDeploy,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$K8sDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$WebDir = Join-Path $RepoRoot 'web'
$VersionFile = Join-Path $RepoRoot 'VERSION'
$KustomizationPath = Join-Path $K8sDir 'kustomization.yaml'
$Image = "$Registry/$Repository`:$Tag"
$SmokeContainer = 'new-api-smoke'

function Invoke-Step {
    param([string]$Label, [string[]]$Command)
    Write-Host ''
    Write-Host "==> $Label" -ForegroundColor Cyan
    Write-Host "    $($Command -join ' ')" -ForegroundColor DarkGray
    if ($DryRun) { Write-Host '    [dry-run] 跳过执行' -ForegroundColor DarkGray; return }
    if ($Command.Count -gt 1) { & $Command[0] @($Command[1..($Command.Count - 1)]) }
    else { & $Command[0] }
    if ($LASTEXITCODE -ne 0) { throw "$Label 失败（退出码 $LASTEXITCODE）" }
}

function New-RandomHex {
    param([int]$Bytes = 32)
    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    return ($buffer | ForEach-Object { $_.ToString('x2') }) -join ''
}

Write-Host ''
Write-Host 'new-api ACK 发布（SQLite 单副本）' -ForegroundColor Cyan
Write-Host "    镜像     : $Image"
Write-Host "    命名空间 : $Namespace"
Write-Host "    部署     : $DeploymentName"

$dirty = git -C $RepoRoot status --porcelain
if ($dirty) { Write-Host '    ! 工作区有未提交改动，镜像会包含这些改动' -ForegroundColor Yellow }

# 1. 前端类型检查。镜像里会重新构建前端，这一步只是为了尽早拿到 TS 报错。
if (-not $SkipBuildCheck) {
    Push-Location $WebDir
    try { Invoke-Step -Label '前端类型检查' -Command @('bun', 'run', 'typecheck') }
    finally { Pop-Location }
}

# 2. 用 Tag 覆写 VERSION：Dockerfile 用 -X 写进后端二进制，前端读同一个值。
$originalVersion = Get-Content -Raw -LiteralPath $VersionFile
Write-Host ''
Write-Host "==> 覆写 VERSION -> $Tag" -ForegroundColor Cyan
if (-not $DryRun) {
    [IO.File]::WriteAllText($VersionFile, "$Tag`n", (New-Object System.Text.UTF8Encoding($false)))
}

try {
    # 3. 构建镜像。必须 linux/amd64，否则 ACK 节点可能报 exec format error。
    Invoke-Step -Label '构建镜像' -Command @(
        'docker', 'build', '--pull', '--platform', 'linux/amd64', '-t', $Image, $RepoRoot
    )

    # 4. 容器冒烟：起容器，用镜像内自带的 wget 校验 /api/status 与首页。
    if ($SkipSmoke) {
        Write-Host ''
        Write-Host '==> 冒烟测试已跳过（-SkipSmoke）' -ForegroundColor Yellow
    }
    elseif (-not $DryRun) {
        Write-Host ''
        Write-Host '==> 容器冒烟测试' -ForegroundColor Cyan
        docker rm -f $SmokeContainer 2>$null | Out-Null
        docker run -d --name $SmokeContainer -e TZ=Asia/Shanghai $Image | Out-Null
        $status = $null
        for ($i = 1; $i -le 30; $i++) {
            Start-Sleep -Seconds 3
            $status = (docker exec $SmokeContainer wget -q -O - http://localhost:3000/api/status) 2>$null
            if ($LASTEXITCODE -eq 0 -and $status -match [regex]::Escape($Tag)) { break }
            $status = $null
        }
        if ($status) {
            $index = (docker exec $SmokeContainer wget -q -O - http://localhost:3000/ 2>$null) -join "`n"
            Write-Host "    OK：/api/status 版本号匹配，首页 $($index.Length) 字符" -ForegroundColor Green
        }
        docker rm -f $SmokeContainer | Out-Null
        if (-not $status) { throw '/api/status 未返回 200 或版本号与 Tag 不匹配' }
    }

    # 5. 推送镜像
    if ($SkipPush) {
        Write-Host ''
        Write-Host '==> 推送已跳过（-SkipPush）' -ForegroundColor Yellow
    }
    else {
        Invoke-Step -Label '推送镜像' -Command @('docker', 'push', $Image)
    }

    # 6. 更新 kustomization.yaml 的 newTag，保持 Git 为唯一事实来源
    Write-Host ''
    Write-Host '==> 更新 kustomization.yaml' -ForegroundColor Cyan
    $kustomization = (Get-Content -Raw -LiteralPath $KustomizationPath) -replace "`r`n", "`n"
    if ($kustomization -notmatch '(?m)^\s*newTag:\s*\S+\s*$') { throw "$KustomizationPath 里找不到 newTag" }
    $updated = $kustomization -replace '(?m)^(\s*newTag:\s*).*$', "`$1$Tag"
    if ($updated -eq $kustomization) {
        Write-Host "    = newTag 已是 $Tag"
    }
    elseif ($DryRun) {
        Write-Host "    [dry-run] newTag -> $Tag" -ForegroundColor DarkGray
    }
    else {
        [IO.File]::WriteAllText($KustomizationPath, $updated, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "    + newTag -> $Tag" -ForegroundColor Green
    }

    # 7. 部署
    if ($SkipDeploy) {
        Write-Host ''
        Write-Host '==> 部署已跳过（-SkipDeploy）' -ForegroundColor Yellow
    }
    else {
        if (-not $DryRun) {
            Invoke-Step -Label '创建命名空间' -Command @('kubectl', 'apply', '-f', (Join-Path $K8sDir 'namespace.yaml'))
            $existing = kubectl -n $Namespace get secret new-api-secret --ignore-not-found -o name
            if ($existing) {
                Write-Host ''
                Write-Host '==> 会话密钥已存在，保持不变' -ForegroundColor Cyan
            }
            else {
                $secret = New-RandomHex -Bytes 32
                Invoke-Step -Label '创建会话密钥' -Command @(
                    'kubectl', '-n', $Namespace, 'create', 'secret', 'generic', 'new-api-secret',
                    "--from-literal=SESSION_SECRET=$secret"
                )
            }
        }
        Invoke-Step -Label '应用到集群' -Command @('kubectl', 'apply', '-k', $K8sDir)
        Invoke-Step -Label '等待发布完成' -Command @(
            'kubectl', '-n', $Namespace, 'rollout', 'status', "deployment/$DeploymentName", '--timeout=600s'
        )
    }
}
finally {
    # 8. 恢复 VERSION，避免把发布用的版本号留在工作区
    if (-not $DryRun) {
        [IO.File]::WriteAllText($VersionFile, $originalVersion, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host ''
        Write-Host '==> 已恢复 VERSION' -ForegroundColor DarkGray
    }
}

Write-Host ''
Write-Host "发布完成：$Tag" -ForegroundColor Green
Write-Host "查看状态：kubectl -n $Namespace get pod,pvc,ingress"
Write-Host "查看日志：kubectl -n $Namespace logs deployment/$DeploymentName --tail=100"
Write-Host "回滚命令：kubectl -n $Namespace set image deployment/$DeploymentName $DeploymentName=$Registry/$Repository`:上一个可用tag"
