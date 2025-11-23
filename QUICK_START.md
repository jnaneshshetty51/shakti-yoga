# Quick Start Guide - Hostinger VPS Deployment

## 🚀 Quick Deployment Steps

### 1. Connect to Your VPS
```bash
ssh root@your-vps-ip
```

### 2. Run Initial Setup
```bash
# Download setup script
wget -O setup-vps.sh https://raw.githubusercontent.com/shaktiyogakendra-cloud/shaktiyoga/main/deploy/setup-vps.sh
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```

### 3. Clone Repository
```bash
# Create directory if it doesn't exist
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

# Clone repository
cd /var/www
git clone https://github.com/shaktiyogakendra-cloud/shaktiyoga.git
cd shaktiyoga
```

**Note:** If `/var/www` doesn't exist, create it with the commands above. Alternatively, you can use your home directory:
```bash
cd ~
git clone https://github.com/shaktiyogakendra-cloud/shaktiyoga.git
cd shaktiyoga
```

### 4. Configure Environment
```bash
# Copy template
cp env.template .env

# Edit with your values
nano .env
```

**Required changes in `.env`:**

All values are in `env.template` file. Here's where to find/configure each:

1. **`DATABASE_URL`** - PostgreSQL connection string
   - Format: `postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public`
   - Default in template: `postgresql://shaktiyoga:changeme@localhost:5432/shaktiyoga?schema=public`
   - **Change:** Replace `changeme` with a secure password you choose
   - Example: `postgresql://shaktiyoga:MySecurePass123@localhost:5432/shaktiyoga?schema=public`

2. **`MINIO_ENDPOINT`** - Your VPS IP address or domain
   - Default: `http://localhost:9000` (for local testing)
   - **Change:** Replace with your VPS IP: `http://YOUR_VPS_IP:9000`
   - Find your VPS IP: Run `curl ifconfig.me` or check Hostinger control panel
   - Example: `http://123.45.67.89:9000`

3. **`MINIO_ACCESS_KEY`** - MinIO access key (like username)
   - Default: `minioadmin`
   - **Change:** Use a secure key of your choice (e.g., `shakti_minio_user_2024`)

4. **`MINIO_SECRET_KEY`** - MinIO secret key (like password)
   - Default: `minioadmin123`
   - **Change:** Use a strong password (e.g., `MySecureMinIOPass123!@#`)

5. **`NEXT_PUBLIC_APP_URL`** - Your website domain
   - Default: `http://your-domain.com`
   - **Change:** Your actual domain (with https after SSL setup)
   - Example: `https://shaktiyoga.com` or `https://www.shaktiyoga.com`

**Quick Setup:**
```bash
# Copy template
cp env.template .env

# Edit the file
nano .env
# Update the values above, save (Ctrl+X, then Y, then Enter)
```

> 📖 **Need more details?** See [ENV_SETUP.md](./ENV_SETUP.md) for complete guide on finding and configuring all environment variables.

### 5. Start Database & MinIO
```bash
# Docker Compose reads from .env file automatically
# Make sure your .env file has these variables (they're already in env.template):
# - POSTGRES_USER=shaktiyoga (or your choice)
# - POSTGRES_PASSWORD=your_secure_password (change from "changeme")
# - POSTGRES_DB=shaktiyoga (or your choice)
# - MINIO_ROOT_USER=your_minio_user (change from "minioadmin")
# - MINIO_ROOT_PASSWORD=your_minio_password (change from "minioadmin123")
# - MINIO_BUCKET=shakti-yoga-assets

# Start services
# Use 'docker compose' (V2) instead of 'docker-compose' (V1)
docker compose up -d

# Wait a few seconds for services to start, then verify
docker ps

# Check logs if needed
docker logs shakti-postgres
docker logs shakti-minio
```

### 6. Deploy Application
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 7. Setup Nginx
```bash
# Copy nginx config
cp deploy/nginx.conf /etc/nginx/sites-available/shakti-yoga

# Edit domain name (already set to shaktiyoga.in, but verify)
nano /etc/nginx/sites-available/shakti-yoga
# Verify domain is set to shaktiyoga.in

# Enable site
ln -s /etc/nginx/sites-available/shakti-yoga /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 8. Setup SSL
```bash
certbot --nginx -d shaktiyoga.in -d www.shaktiyoga.in
```

### 9. Verify
- Visit: `https://shaktiyoga.in`
- Check logs: `pm2 logs shakti-yoga`
- MinIO Console: `http://your-vps-ip:9001`

## 📝 Important Notes

1. **Change all default passwords** before going to production
2. **Update domain names** in nginx.conf and .env
3. **Secure MinIO ports** (9000, 9001) - consider restricting access via firewall
4. **Run database seed** after first deployment: `npm run db:seed`
5. **Ensure .env file is configured** with all required variables before starting services

## 🔧 Common Commands

```bash
# View logs
pm2 logs shakti-yoga

# Restart app
pm2 restart shakti-yoga

# Database migrations
npm run db:migrate

# Database seed
npm run db:seed

# Prisma Studio (database GUI)
npm run db:studio
```

## 🆘 Troubleshooting

**App won't start:**
```bash
pm2 logs shakti-yoga
# Check for errors
```

**Database connection issues:**
```bash
docker ps | grep postgres
docker logs shakti-postgres
```

**MinIO issues:**
```bash
docker ps | grep minio
docker logs shakti-minio
```

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

