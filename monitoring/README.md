# HPA Platform Monitoring

## Overview

The HPA Platform includes comprehensive monitoring with Prometheus and Grafana for metrics collection, visualization, and alerting.

## Components

### Prometheus
- **Port**: 9090
- **Config**: `monitoring/prometheus.yml`
- **Alerts**: `monitoring/prometheus-alerts.yml`
- **Retention**: 30 days
- **Scrape Interval**: 15 seconds

### Grafana
- **Port**: 3001
- **Default User**: admin
- **Default Password**: (generated in `.env.production`)
- **Datasources**: Prometheus, PostgreSQL, Redis
- **Dashboards**: Auto-provisioned

## Access

After deployment, access the monitoring tools at:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

## Metrics Collected

### Application Metrics
- Request rate and latency
- Error rates
- Response time percentiles (p50, p95, p99)
- Active connections
- Authentication attempts

### System Metrics
- CPU usage
- Memory consumption
- Disk I/O
- Network traffic
- Container statistics

### Database Metrics
- Connection pool usage
- Query performance
- Transaction rates
- Lock statistics
- Replication lag (if applicable)

### Redis Metrics
- Memory usage
- Hit/miss rates
- Command statistics
- Connection count
- Eviction statistics

### Agent Metrics
- Connection status
- Heartbeat frequency
- Metrics collection rate
- Command execution status

## Dashboards

### Pre-configured Dashboards

1. **HPA Platform Overview**
   - Service health status
   - Request rates and response times
   - Error rates
   - Resource utilization

2. **Backend Performance**
   - API endpoint metrics
   - Database query performance
   - Cache hit rates
   - JWT token metrics

3. **Agent Monitoring**
   - Connected agents
   - Cluster health
   - Scaling events
   - Communication metrics

4. **Infrastructure**
   - Docker container metrics
   - Host system metrics
   - Network statistics
   - Disk usage

## Alerts

### Critical Alerts
- Backend API down
- Database unreachable
- Redis cache down
- Disk space < 10%

### Warning Alerts
- High response time (>1s p95)
- High error rate (>5%)
- High CPU usage (>80%)
- High memory usage (>800MB)
- No agents connected
- Authentication failures

## Custom Metrics

### Adding Application Metrics

In your Go code:
```go
import "github.com/prometheus/client_golang/prometheus"

var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "hpa_request_duration_seconds",
            Help: "Request duration in seconds",
        },
        []string{"method", "endpoint", "status"},
    )
)

func init() {
    prometheus.MustRegister(requestDuration)
}
```

### Adding to Prometheus Config

Edit `monitoring/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'custom-app'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['your-service:port']
```

## Grafana Configuration

### Adding Datasources

1. Login to Grafana
2. Go to Configuration > Data Sources
3. Add data source
4. Configure connection details

### Creating Custom Dashboards

1. Click "+" > "Create Dashboard"
2. Add panels with Prometheus queries
3. Save dashboard
4. Export as JSON for version control

### Importing Dashboards

```bash
# Copy dashboard JSON to provisioning folder
cp my-dashboard.json monitoring/grafana/dashboards/

# Restart Grafana
docker-compose restart grafana
```

## Prometheus Queries

### Useful Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage in MB
process_resident_memory_bytes / 1024 / 1024

# Active database connections
pg_stat_database_numbackends{datname="hpa_db"}

# Redis memory usage
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

## Alerting

### Slack Integration

Add to `docker-compose.production.yml`:
```yaml
alertmanager:
  image: prom/alertmanager
  volumes:
    - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
  ports:
    - "9093:9093"
```

Create `monitoring/alertmanager.yml`:
```yaml
route:
  receiver: 'slack'
  
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
```

### Email Alerts

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'prometheus@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

## Backup and Restore

### Backup Prometheus Data
```bash
docker run --rm -v hpa_prometheus_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/prometheus-backup.tar.gz -C /data .
```

### Restore Prometheus Data
```bash
docker run --rm -v hpa_prometheus_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/prometheus-backup.tar.gz -C /data
```

### Backup Grafana Dashboards
```bash
# Export all dashboards
for dashboard in $(curl -s http://admin:$GRAFANA_PASSWORD@localhost:3001/api/search | jq -r '.[].uid'); do
  curl -s http://admin:$GRAFANA_PASSWORD@localhost:3001/api/dashboards/uid/$dashboard \
    > monitoring/grafana/dashboards/backup-$dashboard.json
done
```

## Troubleshooting

### Prometheus Not Scraping
1. Check target status: http://localhost:9090/targets
2. Verify network connectivity
3. Check service is exposing `/metrics`
4. Review Prometheus logs: `docker logs hpa_prometheus_prod`

### Grafana Can't Connect to Datasource
1. Check datasource configuration
2. Verify network between containers
3. Check authentication credentials
4. Test connection in Grafana UI

### High Memory Usage
1. Reduce retention period
2. Decrease scrape frequency
3. Optimize queries
4. Add memory limits in docker-compose

### Missing Metrics
1. Verify exporter is running
2. Check Prometheus configuration
3. Ensure metrics path is correct
4. Review service logs

## Performance Tuning

### Prometheus
```yaml
# In prometheus.yml
global:
  scrape_interval: 30s  # Increase for less frequent scraping
  scrape_timeout: 10s
  evaluation_interval: 30s
  
  external_labels:
    monitor: 'hpa-platform'
    
# Optimize storage
storage.tsdb.retention.time: 15d  # Reduce retention
storage.tsdb.retention.size: 10GB  # Limit storage size
```

### Grafana
```ini
# In grafana.ini
[database]
max_open_conn = 25
max_idle_conn = 25

[alerting]
max_attempts = 3

[rendering]
concurrent_render_limit = 5
```

## Security

### Secure Prometheus
```yaml
# Add basic auth to Prometheus
basic_auth_users:
  admin: $2y$10$... # bcrypt hash
```

### Secure Grafana
- Change default admin password
- Enable HTTPS
- Configure OAuth/LDAP
- Set up user roles and permissions

### Network Security
- Use internal Docker network
- Expose only necessary ports
- Implement firewall rules
- Use VPN for remote access