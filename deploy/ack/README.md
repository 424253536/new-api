# new-api 部署到阿里云 ACK（SQLite 单副本）

## 目录

| 文件 | 说明 |
| --- | --- |
| `namespace.yaml` | 命名空间 `new-api` |
| `pvc.yaml` | ESSD 云盘 20Gi，挂到 `/data`（SQLite 数据 + 日志） |
| `configmap.yaml` | 非敏感环境变量；**域名在这里改** |
| `deployment.yaml` | 单副本 + `Recreate`；**镜像地址在这里改** |
| `service.yaml` | ClusterIP 80 → 3000 |
| `ingress-alb.yaml` | ALB Ingress（默认引用）；**证书 ID 和域名在这里改** |
| `ingress-nginx.yaml` | Nginx Ingress 变体，二选一 |
| `kustomization.yaml` | `kubectl apply -k` 的入口，发版只改 `newTag` |
| `release.ps1` | 构建 + 冒烟 + 推送 + 发布 |

## 首次部署前要改 3 处

1. `deployment.yaml` 的 `image`：确认 ACR 命名空间和仓库名（默认 `zhike/new-api`）
2. `pvc.yaml` 的 `storageClassName`：用 `kubectl get sc` 的实际值
3. 域名三处必须一致：`ingress-alb.yaml` 的 `host`、`configmap.yaml` 的
   `SESSION_COOKIE_TRUSTED_URL`、以及 `alb.ingress.kubernetes.io/certificate-id`

## 首次部署

```bash
kubectl apply -f deploy/ack/namespace.yaml
openssl rand -hex 32
kubectl -n new-api create secret generic new-api-secret --from-literal=SESSION_SECRET=<上一步输出>
kubectl apply -k deploy/ack
kubectl -n new-api rollout status deployment/new-api --timeout=600s
```

初始化建议先走 `kubectl -n new-api port-forward svc/new-api 3080:80`，完成向导并改掉
默认口令后再开放公网入口。

## 日常发版

```powershell
cd deploy/ack
./release.ps1 -Tag prod-v1.0.1
```

脚本会用 Tag 覆写 `VERSION` 再构建（后端 `ldflags` 和前端 bundle 都用它），构建结束
后恢复原文件。`-SkipPush -SkipDeploy` 可以只做本地构建和冒烟，`-DryRun` 只打印步骤。

## SQLite 方案的约束

- 每次发版中断几十秒：云盘是 ReadWriteOnce，必须 `Recreate`，先杀旧 Pod 再起新的
- `replicas` 永远是 1，不要加 HPA，也不要改成滚动更新
- 备份只能靠云盘自动快照：运行时镜像里没有 `sqlite3`，也没有 `tar`
