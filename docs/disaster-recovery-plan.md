# Neo FMC - Disaster Recovery Plan (DRP)
**Version:** 1.0  
**Last Updated:** April 2, 2026  
**Classification:** Confidential

---

## 1. Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO (Recovery Time Objective)** | < 4 hours | Microfinance operations can tolerate brief outages; field officers can work offline |
| **RPO (Recovery Point Objective)** | < 1 hour | Financial transactions must have minimal data loss |
| **MTTR (Mean Time to Repair)** | < 2 hours | For non-catastrophic failures |

## 2. Infrastructure Architecture

### Primary Environment
- **Application:** Node.js (Express) on managed container hosting
- **Database:** PostgreSQL with Row-Level Security (RLS)
- **Frontend:** Static assets served via CDN
- **Region:** Primary data center in Egypt-adjacent region (EU South/ME)

### Backup Strategy
| Component | Method | Frequency | Retention |
|-----------|--------|-----------|-----------|
| PostgreSQL Database | Automated snapshots | Every 30 minutes | 30 days |
| Database WAL Logs | Continuous archiving | Real-time | 7 days |
| Application Code | Git repository (multi-remote) | On every commit | Indefinite |
| File Uploads/Documents | Object storage with cross-region replication | Real-time sync | Per retention policy |
| Configuration/Secrets | Encrypted vault backup | Daily | 90 days |

## 3. Disaster Scenarios & Response

### Scenario 1: Database Failure
- **Detection:** Health check endpoint failure, connection pool exhaustion alerts
- **Response:** Automatic failover to read replica; promote replica to primary
- **Recovery Time:** < 15 minutes (automated), < 1 hour (manual)

### Scenario 2: Application Server Failure
- **Detection:** Load balancer health checks (30s intervals)
- **Response:** Auto-scaling group launches replacement instances
- **Recovery Time:** < 5 minutes

### Scenario 3: Full Region Outage
- **Detection:** Multi-region monitoring alerts
- **Response:** DNS failover to secondary region; restore from latest backup
- **Recovery Time:** < 4 hours

### Scenario 4: Data Corruption / Ransomware
- **Detection:** Integrity checks, anomaly detection on data patterns
- **Response:** Isolate affected systems; restore from last known good backup
- **Recovery Time:** < 4 hours (depending on data volume)

### Scenario 5: Security Breach
- **Detection:** WAF alerts, anomalous API patterns, audit log analysis
- **Response:** Incident response team activation; system isolation; forensic analysis
- **Recovery Time:** Variable (24-72 hours for full remediation)

## 4. DR Test Schedule

| Test Type | Frequency | Last Tested | Next Scheduled |
|-----------|-----------|-------------|----------------|
| Database restore from backup | Monthly | TBD | TBD |
| Application failover | Quarterly | TBD | TBD |
| Full DR drill | Semi-annually | TBD | TBD |
| Tabletop exercise | Quarterly | TBD | TBD |

## 5. Communication Plan

### Escalation Matrix
| Severity | Response Time | Notification Channel | Stakeholders |
|----------|--------------|---------------------|--------------|
| P1 (Critical) | 15 minutes | Phone + SMS + Email | CTO, DevOps Lead, All Tenants |
| P2 (Major) | 30 minutes | SMS + Email | DevOps Lead, Affected Tenants |
| P3 (Minor) | 2 hours | Email | DevOps Team |

### Tenant Communication
- Status page: status.neofmc.com
- Email notifications for all P1/P2 incidents
- Post-incident report within 48 hours

## 6. Regulatory Considerations

- All backups comply with PDPL data residency requirements
- Audit logs are preserved per FRA 10-year retention requirement
- Financial transaction records maintained per CBE 7-year requirement
- DR procedures documented and available for FRA audit review

## 7. Team Responsibilities

| Role | Primary | Backup |
|------|---------|--------|
| DR Coordinator | CTO | VP Engineering |
| Database Recovery | DBA Lead | Senior Backend Engineer |
| Application Recovery | DevOps Lead | Senior DevOps Engineer |
| Communication | Product Manager | Customer Success Lead |
| Security Assessment | Security Lead | External Security Consultant |

## 8. Review & Approval

This plan must be reviewed and updated:
- After every DR test
- After any significant infrastructure change
- At minimum every 6 months
- After any actual disaster event
