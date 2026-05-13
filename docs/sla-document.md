# Neo FMC - Service Level Agreement (SLA)
**Version:** 1.0  
**Effective Date:** April 2, 2026

---

## 1. Service Availability

| Plan | Monthly Uptime Guarantee | Maximum Allowed Downtime |
|------|------------------------|-------------------------|
| Basic | 99.5% | ~3.6 hours/month |
| Professional | 99.7% | ~2.2 hours/month |
| Enterprise | 99.9% | ~43 minutes/month |

### Exclusions
Downtime excludes: scheduled maintenance (notified 72h in advance), force majeure events, client-side issues, third-party service outages (payment gateways, CBE/FRA APIs).

## 2. Service Credits

If monthly uptime falls below the guaranteed level:

| Uptime Achieved | Credit (% of Monthly Fee) |
|----------------|--------------------------|
| 99.0% - 99.9% | 10% |
| 98.0% - 99.0% | 25% |
| 95.0% - 98.0% | 50% |
| Below 95.0% | 100% |

Credits are applied to the following billing cycle and do not exceed total monthly fees.

## 3. Support Response Times

| Severity | Description | Response Time | Resolution Target |
|----------|------------|---------------|-------------------|
| P1 - Critical | System down, data loss risk | 15 minutes | 4 hours |
| P2 - Major | Core function impaired | 1 hour | 8 hours |
| P3 - Moderate | Non-critical function affected | 4 hours | 24 hours |
| P4 - Low | Enhancement request, cosmetic | 24 hours | 5 business days |

### Support Channels
- **Enterprise:** 24/7 phone + email + dedicated account manager
- **Professional:** Business hours phone + 24/7 email
- **Basic:** Business hours email

## 4. Performance Standards

| Metric | Target |
|--------|--------|
| API response time (p95) | < 500ms |
| Page load time (p95) | < 3 seconds |
| Report generation | < 30 seconds |
| Database query timeout | 30 seconds |
| File upload limit | 10MB |

## 5. Data Protection

| Measure | Standard |
|---------|----------|
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Backup frequency | Every 30 minutes |
| Backup retention | 30 days |
| RPO | < 1 hour |
| RTO | < 4 hours |

## 6. Compliance

The Platform maintains compliance with:
- Egyptian Personal Data Protection Law (PDPL) No. 151/2020
- FRA microfinance regulations
- CBE circulars on microfinance lending
- AML/CFT Law No. 80/2002
- E-KYC Law No. 5/2022
