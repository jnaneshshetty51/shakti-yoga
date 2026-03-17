# Deployment Guide for Hostinger VPS

This guide will help you deploy the Shakti Yoga application to your Hostinger VPS with PostgreSQL and MinIO.

## Prerequisites

- Hostinger VPS with root/SSH access
- Domain name pointing to your VPS IP (optional but recommended)
- Basic knowledge of Linux commands

## Step 1: Initial VPS Setup

### 1.1 Connect to your VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Run the setup script

```bash
# Download or copy the setup script to your VPS
wget https://raw.githubusercontent.com/your-repo/shakti-yoga/main/deploy/setup-vps.sh
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

Or manually install:

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install required packages
apt-get install -y curl wget git build-essential nginx docker.io docker compose nodejs npm

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Start Docker
systemctl start docker
systemctl enable docker
```

## Step 2: Clone and Configure Application

### 2.1 Clone your repository

```bash
cd /var/www
git clone https://github.com/your-username/shakti-yoga.git
cd shakti-yoga
```

### 2.2 Create environment file

```bash
cp .env.example .env
nano .env
```

Update the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://shaktiyoga:YOUR_SECURE_PASSWORD@localhost:5432/shaktiyoga?schema=public"

# MinIO Configuration
MINIO_ENDPOINT="http://YOUR_VPS_IP:9000"
MINIO_ACCESS_KEY="YOUR_SECURE_ACCESS_KEY"
MINIO_SECRET_KEY="YOUR_SECURE_SECRET_KEY"
MINIO_BUCKET="shakti-yoga-assets"

# Next.js Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**Important:** Replace:
- `YOUR_SECURE_PASSWORD` with a strong PostgreSQL password
- `YOUR_VPS_IP` with your VPS IP address
- `YOUR_SECURE_ACCESS_KEY` and `YOUR_SECURE_SECRET_KEY` with secure MinIO credentials
- `your-domain.com` with your actual domain

### 2.3 Update Docker Compose environment

Edit `docker compose.yml` and update the environment variables:

```bash
nano docker compose.yml
```

Update these values to match your `.env` file:
- `POSTGRES_PASSWORD`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_BUCKET`

## Step 3: Start Database and MinIO

### 3.1 Start services with Docker Compose

```bash
cd /var/www/shakti-yoga
docker compose up -d
```

### 3.2 Verify services are running

```bash
# Check containers
docker ps

# Check PostgreSQL logs
docker logs shakti-postgres

# Check MinIO logs
docker logs shakti-minio
```

### 3.3 Access MinIO Console (optional)

Open your browser and go to: `http://YOUR_VPS_IP:9001`

Login with:
- Username: `minioadmin` (or your MINIO_ROOT_USER)
- Password: `minioadmin123` (or your MINIO_ROOT_PASSWORD)

## Step 4: Deploy Application

### 4.1 Run deployment script

```bash
cd /var/www/shakti-yoga
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Or manually:

```bash
# Install dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### 4.2 Verify application is running

```bash
pm2 status
pm2 logs shakti-yoga
```

## Step 5: Configure Nginx

### 5.1 Copy Nginx configuration

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/shakti-yoga
```

### 5.2 Update domain name

```bash
nano /etc/nginx/sites-available/shakti-yoga
```

Replace `your-domain.com` with your actual domain name.

### 5.3 Enable site

```bash
ln -s /etc/nginx/sites-available/shakti-yoga /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t  # Test configuration
systemctl reload nginx
```

## Step 6: Setup SSL Certificate (Let's Encrypt)

### 6.1 Install Certbot (if not already installed)

```bash
apt-get install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL certificate

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts. Certbot will automatically update your Nginx configuration.

### 6.3 Auto-renewal (already configured by certbot)

Certbot sets up automatic renewal. Test it:

```bash
certbot renew --dry-run
```

## Step 7: Configure Firewall

```bash
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 9000/tcp # MinIO API (optional, can be restricted)
ufw allow 9001/tcp # MinIO Console (optional, can be restricted)
ufw enable
```

## Step 8: Verify Deployment

1. **Check application**: Visit `https://your-domain.com`
2. **Check database**: Run `npx prisma studio` (optional)
3. **Check MinIO**: Visit `http://YOUR_VPS_IP:9001`
4. **Check logs**: `pm2 logs shakti-yoga`

## Maintenance Commands

### View logs
```bash
pm2 logs shakti-yoga
docker logs shakti-postgres
docker logs shakti-minio
```

### Restart application
```bash
pm2 restart shakti-yoga
```

### Update application
```bash
cd /var/www/shakti-yoga
git pull
./deploy/deploy.sh
```

### Database migrations
```bash
cd /var/www/shakti-yoga
npx prisma migrate deploy
```

### Backup database
```bash
docker exec shakti-postgres pg_dump -U shaktiyoga shaktiyoga > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
docker exec -i shakti-postgres psql -U shaktiyoga shaktiyoga < backup_20240101.sql
```

## Troubleshooting

### Application won't start
```bash
pm2 logs shakti-yoga
# Check for errors in logs
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
cat .env | grep DATABASE_URL

# Test connection
docker exec -it shakti-postgres psql -U shaktiyoga -d shaktiyoga
```

### MinIO connection issues
```bash
# Check if MinIO is running
docker ps | grep minio

# Check MinIO logs
docker logs shakti-minio

# Verify bucket exists
docker exec shakti-minio-setup /usr/bin/mc ls myminio/
```

### Nginx issues
```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/shakti-yoga-error.log
```

## Security Recommendations

1. **Change default passwords**: Update all default passwords in `.env` and `docker compose.yml`
2. **Restrict MinIO ports**: Only allow MinIO access from trusted IPs or use VPN
3. **Regular updates**: Keep system and packages updated
4. **Firewall**: Use UFW to restrict unnecessary ports
5. **SSL**: Always use HTTPS in production
6. **Backups**: Set up regular database backups

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `MINIO_ENDPOINT` | MinIO API endpoint | `http://your-ip:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `your-access-key` |
| `MINIO_SECRET_KEY` | MinIO secret key | `your-secret-key` |
| `MINIO_BUCKET` | MinIO bucket name | `shakti-yoga-assets` |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | `https://your-domain.com` |

## Support

For issues or questions, check:
- Application logs: `pm2 logs shakti-yoga`
- Nginx logs: `/var/log/nginx/shakti-yoga-error.log`
- Docker logs: `docker logs <container-name>`

