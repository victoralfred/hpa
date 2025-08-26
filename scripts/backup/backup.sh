#!/bin/bash

# HPA Platform Database Backup Script
# This script performs automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-hpa_admin}"
DB_NAME="${DB_NAME:-hpa_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "======================================"
echo "HPA Platform Database Backup"
echo "======================================"
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Creating backup..."
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    echo -e "${GREEN}✓ Backup created successfully: $BACKUP_FILE${NC}"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Compress backup
echo "Compressing backup..."
if gzip "$BACKUP_FILE"; then
    echo -e "${GREEN}✓ Backup compressed: ${BACKUP_FILE}.gz${NC}"
    COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "Compressed size: $COMPRESSED_SIZE"
else
    echo -e "${YELLOW}⚠ Compression failed, keeping uncompressed backup${NC}"
fi

# Clean old backups
echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type f -name "backup_*.sql*" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Old backups cleaned${NC}"

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql* 2>/dev/null | tail -5

echo ""
echo "======================================"
echo -e "${GREEN}Backup complete!${NC}"
echo "======================================"