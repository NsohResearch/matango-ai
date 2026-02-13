# Matango.ai Operations Guide

**Version:** 1.0  
**Last Updated:** January 8, 2026

---

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Database Backups](#database-backups)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Secret Management](#secret-management)

---

## Environment Configuration

### Environment Separation

Matango.ai supports three environments:

| Environment | Purpose | Database | Domain |
|-------------|---------|----------|--------|
| Development | Local development | Local MySQL | localhost:3000 |
| Staging | Pre-production testing | Staging DB | staging.matango.ai |
| Production | Live system | Production DB | app.matango.ai |

### Required Environment Variables

```bash
# Core
NODE_ENV=production
DATABASE_URL=mysql://user:pass@host:3306/matango

# Authentication
JWT_SECRET=<32+ character random string>
OAUTH_SERVER_URL=<OAuth provider URL>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI Services
BUILT_IN_FORGE_API_KEY=<Forge API key>
BUILT_IN_FORGE_API_URL=<Forge API URL>

# Storage
AWS_ACCESS_KEY_ID=<S3 access key>
AWS_SECRET_ACCESS_KEY=<S3 secret>
AWS_S3_BUCKET=matango-assets
AWS_REGION=us-east-1
```

---

## Database Backups

### Automated Backup Strategy

**Frequency:**
- Full backup: Daily at 02:00 UTC
- Incremental backup: Every 6 hours
- Transaction log backup: Every 15 minutes

**Retention:**
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

### Backup Script

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/mysql
S3_BUCKET=matango-backups

# Create backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS \
  --single-transaction \
  --routines \
  --triggers \
  matango > $BACKUP_DIR/matango_$DATE.sql

# Compress
gzip $BACKUP_DIR/matango_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/matango_$DATE.sql.gz \
  s3://$S3_BUCKET/daily/matango_$DATE.sql.gz

# Cleanup local (keep 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: matango_$DATE.sql.gz"
```

### Restore Procedure

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: restore-database.sh <backup-file.sql.gz>"
  exit 1
fi

# Download from S3 if needed
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp $BACKUP_FILE /tmp/restore.sql.gz
  BACKUP_FILE=/tmp/restore.sql.gz
fi

# Decompress
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# Restore
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS matango < /tmp/restore.sql

echo "Restore completed from: $BACKUP_FILE"
```

### Restore Verification

Run monthly restore tests:

1. Restore backup to staging environment
2. Run health checks: `curl https://staging.matango.ai/ready`
3. Verify data integrity with spot checks
4. Document results in operations log

---

## Deployment Procedures

### Zero-Downtime Deployment

Matango.ai uses rolling deployments to ensure zero downtime:

1. **Build Phase**
   - Build new Docker image
   - Run automated tests
   - Push to container registry

2. **Deploy Phase**
   - Deploy to 1 instance first (canary)
   - Monitor for 5 minutes
   - If healthy, deploy to remaining instances
   - If unhealthy, rollback canary

3. **Verification Phase**
   - Run smoke tests
   - Verify health endpoints
   - Check error rates in monitoring

### Deployment Checklist

Before deployment:
- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables updated
- [ ] Rollback plan documented

During deployment:
- [ ] Monitor error rates
- [ ] Watch response times
- [ ] Check health endpoints

After deployment:
- [ ] Verify key user flows
- [ ] Check monitoring dashboards
- [ ] Update deployment log

### Rollback Procedure

If issues are detected:

```bash
# Immediate rollback to previous version
kubectl rollout undo deployment/matango-api

# Or rollback to specific version
kubectl rollout undo deployment/matango-api --to-revision=<revision>
```

---

## Monitoring & Alerting

### Health Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/health` | Basic liveness | `{"status": "healthy"}` |
| `/ready` | Readiness check | `{"status": "ready", "checks": {...}}` |
| `/metrics` | Prometheus metrics | Metrics in text format |

### Key Metrics to Monitor

**Application:**
- Request rate (requests/second)
- Error rate (5xx responses)
- Response time (p50, p95, p99)
- Active users

**Infrastructure:**
- CPU utilization
- Memory usage
- Database connections
- Disk I/O

**Business:**
- Campaign generations per hour
- Assets published per day
- Active subscriptions

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 1% | > 5% |
| Response time (p95) | > 2s | > 5s |
| CPU utilization | > 70% | > 90% |
| Memory utilization | > 80% | > 95% |
| Database connections | > 80% | > 95% |

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Complete outage | 15 minutes | Site down, data loss |
| P2 | Major feature broken | 1 hour | Publishing fails, auth broken |
| P3 | Minor feature issue | 4 hours | UI bug, slow performance |
| P4 | Cosmetic/minor | Next business day | Typos, minor UI issues |

### Incident Response Steps

1. **Detect** - Alert received or issue reported
2. **Acknowledge** - Assign incident owner
3. **Diagnose** - Identify root cause
4. **Mitigate** - Apply temporary fix if needed
5. **Resolve** - Implement permanent fix
6. **Review** - Post-incident review within 48 hours

### Runbooks

**Site Down:**
1. Check health endpoints
2. Review recent deployments
3. Check database connectivity
4. Review error logs
5. If needed, rollback last deployment

**High Error Rate:**
1. Identify error type in logs
2. Check external service status (Forge, Stripe)
3. Review circuit breaker states
4. Scale up if load-related

---

## Secret Management

### Secret Rotation Schedule

| Secret | Rotation Frequency | Procedure |
|--------|-------------------|-----------|
| JWT_SECRET | Quarterly | Rolling update with overlap |
| Database password | Quarterly | Update in vault, rotate app |
| API keys | Annually | Generate new, update, revoke old |
| Stripe keys | As needed | Via Stripe dashboard |

### Rotation Procedure

1. Generate new secret value
2. Update in secrets manager
3. Deploy application with new secret
4. Verify functionality
5. Revoke old secret (after grace period)

### Access Control

- Production secrets: DevOps team only
- Staging secrets: Engineering team
- Development: Individual developer keys

---

## S3 Lifecycle Policies

### Asset Storage

```json
{
  "Rules": [
    {
      "ID": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "ID": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
```

### Backup Storage

```json
{
  "Rules": [
    {
      "ID": "TransitionToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "ID": "ExpireOldBackups",
      "Status": "Enabled",
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

*Document maintained by Matango.ai Operations Team*
