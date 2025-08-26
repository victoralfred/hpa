#!/bin/bash

# HPA Platform - EC2 Docker Deployment Script
# This script automates the deployment process on AWS EC2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.xlarge}"
REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${SSH_KEY_NAME:-hpa-key}"
PROJECT_NAME="hpa-platform"

echo -e "${GREEN}🚀 HPA Platform EC2 Deployment Script${NC}"
echo "========================================="

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Check SSH key
    if ! aws ec2 describe-key-pairs --key-names $KEY_NAME &> /dev/null; then
        log_warn "SSH key '$KEY_NAME' not found. Creating new key pair..."
        aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem
        chmod 400 ${KEY_NAME}.pem
        log_info "SSH key created: ${KEY_NAME}.pem"
    fi
    
    log_info "Prerequisites check completed ✓"
}

# Create security group
create_security_group() {
    log_info "Setting up security group..."
    
    SG_NAME="${PROJECT_NAME}-sg"
    
    # Check if security group exists
    if aws ec2 describe-security-groups --group-names $SG_NAME &> /dev/null; then
        log_warn "Security group '$SG_NAME' already exists"
        SG_ID=$(aws ec2 describe-security-groups --group-names $SG_NAME --query 'SecurityGroups[0].GroupId' --output text)
    else
        # Create security group
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SG_NAME \
            --description "Security group for HPA Platform" \
            --query 'GroupId' \
            --output text)
        
        # Add rules
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 50051 --cidr 10.0.0.0/8
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3001 --cidr 0.0.0.0/0  # Grafana
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 9090 --cidr 0.0.0.0/0  # Prometheus
        
        log_info "Security group created: $SG_ID"
    fi
    
    echo $SG_ID
}

# Get latest Ubuntu AMI
get_ubuntu_ami() {
    log_info "Finding latest Ubuntu 22.04 AMI..."
    
    AMI_ID=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters \
            "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
            "Name=state,Values=available" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text)
    
    log_info "Using AMI: $AMI_ID"
    echo $AMI_ID
}

# Create user data script
create_user_data() {
    cat << 'EOF' > /tmp/ec2-userdata.sh
#!/bin/bash
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install tools
apt-get install -y git nginx certbot python3-certbot-nginx htop jq

# Configure system
cat >> /etc/sysctl.conf <<END
vm.max_map_count=262144
fs.file-max=65536
END
sysctl -p

# Setup swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Clone repository
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/your-org/hpa-platform.git
chown -R ubuntu:ubuntu /home/ubuntu/hpa-platform

# Signal completion
touch /tmp/setup-complete
EOF
}

# Launch EC2 instance
launch_instance() {
    log_info "Launching EC2 instance..."
    
    SG_ID=$(create_security_group)
    AMI_ID=$(get_ubuntu_ami)
    create_user_data
    
    # Get default VPC and subnet
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0].SubnetId' --output text)
    
    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --subnet-id $SUBNET_ID \
        --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3}" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}},{Key=Environment,Value=production}]" \
        --user-data file:///tmp/ec2-userdata.sh \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    log_info "Instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    log_info "Waiting for instance to start..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    log_info "Instance is running!"
    log_info "Public IP: $PUBLIC_IP"
    
    echo $PUBLIC_IP
}

# Setup application on instance
setup_application() {
    PUBLIC_IP=$1
    
    log_info "Waiting for instance initialization..."
    
    # Wait for user data script to complete
    while ! ssh -o StrictHostKeyChecking=no -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP "test -f /tmp/setup-complete" 2>/dev/null; do
        echo -n "."
        sleep 10
    done
    echo ""
    
    log_info "Setting up application..."
    
    # Copy environment template
    cat << 'EOF' > /tmp/env-template
# Database
DB_USER=hpa_admin
DB_PASSWORD=GENERATE_PASSWORD
DB_NAME=hpa_db

# Redis
REDIS_PASSWORD=GENERATE_PASSWORD

# JWT
JWT_SECRET=GENERATE_PASSWORD
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Application
ENVIRONMENT=production
LOG_LEVEL=info
ALLOWED_ORIGINS=http://PUBLIC_IP
FRONTEND_API_URL=http://PUBLIC_IP/api

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=GENERATE_PASSWORD

# Agent
CLUSTER_ID=aws-ec2-docker
CLUSTER_NAME=AWS EC2 Docker Cluster
TENANT_ID=default
AGENT_TOKEN=GENERATE_PASSWORD

# Version
VERSION=1.0.0
EOF
    
    # Copy and setup application
    scp -o StrictHostKeyChecking=no -i ${KEY_NAME}.pem /tmp/env-template ubuntu@$PUBLIC_IP:/tmp/
    
    ssh -o StrictHostKeyChecking=no -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP << ENDSSH
        cd /home/ubuntu/hpa-platform
        
        # Generate passwords
        sed -i "s/GENERATE_PASSWORD/\$(openssl rand -base64 32)/g" /tmp/env-template
        sed -i "s/PUBLIC_IP/$PUBLIC_IP/g" /tmp/env-template
        
        # Create production environment file
        cp /tmp/env-template .env.production
        chmod 600 .env.production
        
        # Build and start services
        docker-compose -f docker-compose.production.yml build
        docker-compose -f docker-compose.production.yml --env-file .env.production up -d
        
        # Show status
        docker-compose -f docker-compose.production.yml ps
ENDSSH
    
    log_info "Application setup completed!"
}

# Verify deployment
verify_deployment() {
    PUBLIC_IP=$1
    
    log_info "Verifying deployment..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check health endpoints
    if curl -s http://$PUBLIC_IP/health | grep -q "ok"; then
        log_info "✓ Backend health check passed"
    else
        log_warn "Backend health check failed"
    fi
    
    if curl -s http://$PUBLIC_IP | grep -q "HPA"; then
        log_info "✓ Frontend is accessible"
    else
        log_warn "Frontend not accessible"
    fi
    
    log_info "Deployment verification completed!"
}

# Main deployment flow
main() {
    echo ""
    log_info "Starting HPA Platform deployment to AWS EC2..."
    echo ""
    
    check_prerequisites
    PUBLIC_IP=$(launch_instance)
    setup_application $PUBLIC_IP
    verify_deployment $PUBLIC_IP
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "========================================="
    echo ""
    echo "Access your application:"
    echo "  Frontend: http://$PUBLIC_IP"
    echo "  Backend API: http://$PUBLIC_IP/api"
    echo "  Health Check: http://$PUBLIC_IP/health"
    echo "  Grafana: http://$PUBLIC_IP:3001"
    echo "  Prometheus: http://$PUBLIC_IP:9090"
    echo ""
    echo "SSH access:"
    echo "  ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
    echo ""
    echo "View logs:"
    echo "  ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'cd hpa-platform && docker-compose -f docker-compose.production.yml logs -f'"
    echo ""
    echo "Instance ID: $INSTANCE_ID"
    echo "Region: $REGION"
    echo ""
    
    # Save deployment info
    cat << EOF > deployment-info.json
{
    "instance_id": "$INSTANCE_ID",
    "public_ip": "$PUBLIC_IP",
    "region": "$REGION",
    "instance_type": "$INSTANCE_TYPE",
    "key_name": "$KEY_NAME",
    "deployment_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    log_info "Deployment information saved to deployment-info.json"
}

# Run main function
main