# Deployment Files Summary

This document lists all the files created for VPS deployment.

## 📁 Files Created

### Docker & Infrastructure
- **`docker compose.yml`** - Docker Compose configuration for PostgreSQL and MinIO
  - PostgreSQL 16 Alpine container
  - MinIO server with console
  - Automatic bucket creation and public access setup

### Environment Configuration
- **`env.template`** - Template file for environment variables
  - Copy to `.env` and update with your values
  - Contains all required environment variables

### Deployment Scripts
- **`deploy/setup-vps.sh`** - Initial VPS setup script
  - Installs required packages (Node.js, Docker, Nginx, PM2)
  - Configures firewall
  - Sets up directories

- **`deploy/deploy.sh`** - Application deployment script
  - Installs dependencies
  - Runs database migrations
  - Builds Next.js app
  - Starts with PM2

- **`deploy/nginx.conf`** - Nginx reverse proxy configuration
  - HTTP to HTTPS redirect
  - SSL configuration
  - Proxy to Next.js app
  - Security headers

### Process Management
- **`ecosystem.config.js`** - PM2 configuration
  - Application process management
  - Logging configuration
  - Auto-restart settings

### Documentation
- **`DEPLOYMENT.md`** - Comprehensive deployment guide
  - Step-by-step instructions
  - Troubleshooting section
  - Maintenance commands

- **`QUICK_START.md`** - Quick reference guide
  - Fast deployment steps
  - Common commands
  - Quick troubleshooting

## 🔧 Updated Files

### package.json
Added new scripts:
- `db:migrate` - Run database migrations
- `db:generate` - Generate Prisma Client
- `db:seed` - Seed database
- `db:studio` - Open Prisma Studio

## 📋 Deployment Checklist

Before deploying, ensure:

- [ ] `.env` file created from `env.template`
- [ ] All passwords changed from defaults
- [ ] Domain name configured in nginx.conf
- [ ] Domain name configured in .env (NEXT_PUBLIC_APP_URL)
- [ ] VPS IP/domain configured for MinIO_ENDPOINT
- [ ] Docker and Docker Compose installed
- [ ] Node.js 20.x installed
- [ ] PM2 installed globally
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)

## 🚀 Quick Deploy Command Sequence

```bash
# 1. Setup VPS
./deploy/setup-vps.sh

# 2. Configure environment
cp env.template .env
nano .env  # Update values

# 3. Start services
docker compose up -d

# 4. Deploy app
./deploy/deploy.sh

# 5. Setup Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/shakti-yoga
# Edit domain name, then:
ln -s /etc/nginx/sites-available/shakti-yoga /etc/nginx/sites-enabled/
systemctl reload nginx

# 6. SSL
certbot --nginx -d your-domain.com
```

## 🔐 Security Notes

1. **Change all default passwords** before production
2. **Use strong passwords** for database and MinIO
3. **Restrict MinIO ports** (9000, 9001) if possible
4. **Enable firewall** (UFW) with only necessary ports
5. **Use HTTPS** in production (SSL certificate)
6. **Keep system updated** regularly

## 📊 Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Next.js App | 3000 | Application (internal) |
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | File storage API |
| MinIO Console | 9001 | MinIO web interface |
| Nginx HTTP | 80 | Web server (HTTP) |
| Nginx HTTPS | 443 | Web server (HTTPS) |

## 🆘 Support

For detailed instructions, see:
- **DEPLOYMENT.md** - Full deployment guide
- **QUICK_START.md** - Quick reference

For issues:
- Check logs: `pm2 logs shakti-yoga`
- Check Docker: `docker ps` and `docker logs <container>`
- Check Nginx: `nginx -t` and `/var/log/nginx/`

