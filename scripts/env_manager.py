#!/usr/bin/env python3
"""
HPA Platform Environment Manager
Manages environment variables for Docker Compose deployment
"""

import os
import sys
import secrets
import string
import subprocess
import json
from pathlib import Path
from datetime import datetime
import urllib.request

class EnvManager:
    def __init__(self, env_file=".env.production"):
        self.project_root = Path(__file__).parent.parent
        self.env_file = self.project_root / env_file
        self.env_vars = {}
        
    def generate_password(self, length=25):
        """Generate a secure password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def generate_token(self):
        """Generate a secure token"""
        return secrets.token_hex(32)
    
    def get_public_ip(self):
        """Get public IP address"""
        try:
            with urllib.request.urlopen('http://checkip.amazonaws.com') as response:
                return response.read().decode('utf-8').strip()
        except:
            return "localhost"
    
    def generate_env_vars(self):
        """Generate all required environment variables"""
        public_ip = self.get_public_ip()
        
        self.env_vars = {
            # Database
            "DB_USER": "hpa_admin",
            "DB_PASSWORD": self.generate_password(),
            "DB_NAME": "hpa_db",
            
            # Redis
            "REDIS_PASSWORD": self.generate_password(),
            
            # JWT & Security
            "JWT_SECRET": self.generate_token(),
            "JWT_ACCESS_TOKEN_EXPIRY": "15m",
            "JWT_REFRESH_TOKEN_EXPIRY": "7d",
            "REQUIRE_EMAIL_VERIFICATION": "true",
            
            # Application
            "ENVIRONMENT": "production",
            "LOG_LEVEL": "info",
            "VERSION": "1.0.0",
            "ALLOWED_ORIGINS": f"http://{public_ip},http://localhost,https://{public_ip}",
            "FRONTEND_API_URL": f"http://{public_ip}/api",
            
            # Rate Limiting
            "RATE_LIMIT_REQUESTS": "100",
            "RATE_LIMIT_WINDOW": "1m",
            
            # Features
            "ENABLE_TRACING": "false",
            "TLS_ENABLED": "false",
            
            # Agent
            "CLUSTER_ID": "docker-cluster",
            "CLUSTER_NAME": "Docker Test Cluster",
            "TENANT_ID": "default",
            "AGENT_TOKEN": self.generate_token(),
            
            # Grafana
            "GRAFANA_USER": "admin",
            "GRAFANA_PASSWORD": self.generate_password(),
            "GRAFANA_ROOT_URL": f"http://{public_ip}:3001",
            
            # OAuth (empty by default)
            "OAUTH_GOOGLE_CLIENT_ID": "",
            "OAUTH_GOOGLE_CLIENT_SECRET": "",
            "OAUTH_GITHUB_CLIENT_ID": "",
            "OAUTH_GITHUB_CLIENT_SECRET": "",
        }
        
        return self.env_vars
    
    def load_from_file(self):
        """Load environment variables from file"""
        if not self.env_file.exists():
            return False
        
        with open(self.env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    self.env_vars[key] = value
        
        return True
    
    def save_to_file(self):
        """Save environment variables to file"""
        with open(self.env_file, 'w') as f:
            f.write(f"# HPA Platform Production Environment Variables\n")
            f.write(f"# Generated on {datetime.now()}\n")
            f.write(f"# Host: {os.uname().nodename}\n\n")
            
            # Group variables by category
            categories = {
                "Database Configuration": ["DB_USER", "DB_PASSWORD", "DB_NAME"],
                "Redis Configuration": ["REDIS_PASSWORD"],
                "JWT & Security": ["JWT_SECRET", "JWT_ACCESS_TOKEN_EXPIRY", "JWT_REFRESH_TOKEN_EXPIRY", "REQUIRE_EMAIL_VERIFICATION"],
                "Application Configuration": ["ENVIRONMENT", "LOG_LEVEL", "VERSION", "ALLOWED_ORIGINS", "FRONTEND_API_URL", "RATE_LIMIT_REQUESTS", "RATE_LIMIT_WINDOW", "ENABLE_TRACING", "TLS_ENABLED"],
                "Agent Configuration": ["CLUSTER_ID", "CLUSTER_NAME", "TENANT_ID", "AGENT_TOKEN"],
                "Monitoring": ["GRAFANA_USER", "GRAFANA_PASSWORD", "GRAFANA_ROOT_URL"],
                "OAuth": ["OAUTH_GOOGLE_CLIENT_ID", "OAUTH_GOOGLE_CLIENT_SECRET", "OAUTH_GITHUB_CLIENT_ID", "OAUTH_GITHUB_CLIENT_SECRET"],
            }
            
            for category, keys in categories.items():
                f.write(f"# {'='*44}\n")
                f.write(f"# {category}\n")
                f.write(f"# {'='*44}\n")
                for key in keys:
                    if key in self.env_vars:
                        f.write(f"{key}={self.env_vars[key]}\n")
                f.write("\n")
        
        # Set restrictive permissions
        os.chmod(self.env_file, 0o600)
    
    def export_to_shell(self):
        """Export variables to current shell environment"""
        for key, value in self.env_vars.items():
            os.environ[key] = value
    
    def load_or_generate(self):
        """Load existing env vars or generate new ones"""
        if self.env_file.exists():
            print(f"Loading existing environment from {self.env_file}")
            self.load_from_file()
        else:
            print("Generating new environment variables...")
            self.generate_env_vars()
            self.save_to_file()
            print(f"Environment saved to {self.env_file}")
    
    def verify_required_vars(self):
        """Verify all required variables are set"""
        required = [
            "DB_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET", 
            "AGENT_TOKEN", "GRAFANA_PASSWORD"
        ]
        
        missing = [var for var in required if var not in self.env_vars or not self.env_vars[var]]
        
        if missing:
            print(f"❌ Missing required variables: {', '.join(missing)}")
            return False
        
        print("✅ All required environment variables are set")
        return True
    
    def print_credentials(self):
        """Print generated credentials"""
        print("\n" + "="*50)
        print("Generated Credentials")
        print("="*50)
        
        creds = {
            "Database": {
                "User": self.env_vars.get("DB_USER"),
                "Password": self.env_vars.get("DB_PASSWORD")
            },
            "Redis": {
                "Password": self.env_vars.get("REDIS_PASSWORD")
            },
            "Grafana": {
                "User": self.env_vars.get("GRAFANA_USER"),
                "Password": self.env_vars.get("GRAFANA_PASSWORD")
            },
            "Agent": {
                "Token": self.env_vars.get("AGENT_TOKEN")
            }
        }
        
        for service, details in creds.items():
            print(f"\n{service}:")
            for key, value in details.items():
                if value:
                    print(f"  {key}: {value}")
        
        print("\n⚠️  IMPORTANT: Save these credentials securely!")
        print("="*50)
    
    def run_docker_compose(self, args):
        """Run docker-compose with environment variables"""
        self.export_to_shell()
        
        cmd = [
            "docker-compose",
            "-f", str(self.project_root / "docker-compose.production.yml"),
            "--env-file", str(self.env_file)
        ] + args
        
        print(f"Running: {' '.join(cmd)}")
        return subprocess.run(cmd).returncode

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="HPA Platform Environment Manager")
    parser.add_argument("--generate", action="store_true", help="Generate new environment variables")
    parser.add_argument("--load", action="store_true", help="Load from existing file")
    parser.add_argument("--export", action="store_true", help="Export to shell environment")
    parser.add_argument("--verify", action="store_true", help="Verify required variables")
    parser.add_argument("--show", action="store_true", help="Show credentials")
    parser.add_argument("--docker-compose", nargs=argparse.REMAINDER, help="Run docker-compose with env vars")
    
    args = parser.parse_args()
    
    manager = EnvManager()
    
    if args.generate:
        manager.generate_env_vars()
        manager.save_to_file()
        manager.print_credentials()
    elif args.load:
        if manager.load_from_file():
            print("✅ Environment loaded successfully")
        else:
            print("❌ Failed to load environment file")
            sys.exit(1)
    elif args.export:
        manager.load_or_generate()
        manager.export_to_shell()
        print("✅ Variables exported to shell environment")
    elif args.verify:
        manager.load_or_generate()
        if not manager.verify_required_vars():
            sys.exit(1)
    elif args.show:
        manager.load_or_generate()
        manager.print_credentials()
    elif args.docker_compose:
        manager.load_or_generate()
        if manager.verify_required_vars():
            sys.exit(manager.run_docker_compose(args.docker_compose))
        else:
            sys.exit(1)
    else:
        # Default action: load or generate and verify
        manager.load_or_generate()
        manager.verify_required_vars()
        
        print("\nUsage examples:")
        print("  python3 env_manager.py --generate    # Generate new env vars")
        print("  python3 env_manager.py --verify      # Verify env vars")
        print("  python3 env_manager.py --docker-compose up -d  # Run docker-compose")

if __name__ == "__main__":
    main()