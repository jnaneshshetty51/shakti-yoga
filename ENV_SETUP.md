# Environment Variables Setup Guide

This guide explains where to find and configure all environment variables.

## 📁 Where to Find Values

All default values are in the **`env.template`** file. Copy it to `.env` and update:

```bash
cp env.template .env
nano .env
```

## 🔑 Environment Variables Explained

### 1. DATABASE_URL
**What it is:** PostgreSQL database connection string

**Where to find:**
- Default in `env.template`: `postgresql://shaktiyoga:changeme@localhost:5432/shaktiyoga?schema=public`
- Format: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public`

**What to change:**
- Replace `changeme` with your secure password
- Keep `localhost:5432` (Docker container is on localhost from app's perspective)
- Keep `shaktiyoga` for username and database name (or change if you prefer)

**Example:**
```env
DATABASE_URL="postgresql://shaktiyoga:MySecurePass123@localhost:5432/shaktiyoga?schema=public"
```

**Note:** This password must match `POSTGRES_PASSWORD` in docker compose.yml (or .env if using env_file)

---

### 2. MINIO_ENDPOINT
**What it is:** MinIO storage server URL

**Where to find:**
- Default: `http://localhost:9000` (for local testing)
- For production: Your VPS IP address

**How to get your VPS IP:**
```bash
# On your VPS, run:
curl ifconfig.me
# or
hostname -I
```

**What to change:**
- Replace `localhost` with your VPS IP address
- Keep port `9000` (MinIO API port)

**Example:**
```env
MINIO_ENDPOINT="http://123.45.67.89:9000"
```

**After SSL setup:** You can use your domain:
```env
MINIO_ENDPOINT="https://your-domain.com:9000"
```

---

### 3. MINIO_ACCESS_KEY
**What it is:** MinIO username/access key

**Where to find:**
- Default in `env.template`: `minioadmin`

**What to change:**
- Create your own secure access key
- Must match `MINIO_ROOT_USER` in docker compose.yml

**Example:**
```env
MINIO_ACCESS_KEY="shakti_storage_admin"
```

---

### 4. MINIO_SECRET_KEY
**What it is:** MinIO password/secret key

**Where to find:**
- Default in `env.template`: `minioadmin123`

**What to change:**
- Create a strong password
- Must match `MINIO_ROOT_PASSWORD` in docker compose.yml

**Example:**
```env
MINIO_SECRET_KEY="MySecureMinIOPass123!@#"
```

---

### 5. NEXT_PUBLIC_APP_URL
**What it is:** Your website's public URL

**Where to find:**
- Default: `http://your-domain.com`
- Your actual domain name

**What to change:**
- Replace with your domain
- Use `https://` after SSL certificate is set up

**Example:**
```env
NEXT_PUBLIC_APP_URL="https://shaktiyoga.com"
```

**Before SSL:** Use `http://` temporarily
```env
NEXT_PUBLIC_APP_URL="http://your-domain.com"
```

---

## 🔄 Docker Compose Variables

Docker Compose also needs these variables. You can either:

### Option 1: Add to .env file (Recommended)
Add these to your `.env` file:
```env
POSTGRES_USER=shaktiyoga
POSTGRES_PASSWORD=MySecurePass123
POSTGRES_DB=shaktiyoga
MINIO_ROOT_USER=shakti_storage_admin
MINIO_ROOT_PASSWORD=MySecureMinIOPass123!@#
MINIO_BUCKET=shakti-yoga-assets
```

### Option 2: Edit docker compose.yml directly
Update the default values in `docker compose.yml`:
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_password_here}
MINIO_ROOT_USER: ${MINIO_ROOT_USER:-your_minio_user}
MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-your_minio_password}
```

---

## ✅ Quick Setup Checklist

1. **Copy template:**
   ```bash
   cp env.template .env
   ```

2. **Edit .env file:**
   ```bash
   nano .env
   ```

3. **Update these values:**
   - [ ] `DATABASE_URL` - Change password from "changeme"
   - [ ] `MINIO_ENDPOINT` - Replace localhost with VPS IP
   - [ ] `MINIO_ACCESS_KEY` - Change from "minioadmin"
   - [ ] `MINIO_SECRET_KEY` - Change from "minioadmin123"
   - [ ] `NEXT_PUBLIC_APP_URL` - Your domain
   - [ ] Add Docker Compose variables (POSTGRES_PASSWORD, etc.)

4. **Save and exit:**
   - Press `Ctrl+X`
   - Press `Y` to confirm
   - Press `Enter` to save

---

## 🔍 Finding Your VPS IP

If you don't know your VPS IP address:

**Method 1: From Hostinger Control Panel**
- Login to Hostinger
- Go to VPS section
- Your IP address is displayed there

**Method 2: From SSH**
```bash
# On your VPS, run:
curl ifconfig.me
```

**Method 3: Check network config**
```bash
hostname -I
# or
ip addr show
```

---

## 🛡️ Security Best Practices

1. **Use strong passwords** - At least 16 characters, mix of letters, numbers, symbols
2. **Never commit .env** - It's already in .gitignore
3. **Change defaults** - Don't use "changeme" or "minioadmin123" in production
4. **Use different passwords** - Don't reuse passwords across services
5. **Rotate regularly** - Change passwords periodically

---

## 📝 Example Complete .env File

```env
# Database Configuration
DATABASE_URL="postgresql://shaktiyoga:MySecureDBPass123@localhost:5432/shaktiyoga?schema=public"

# MinIO Configuration
MINIO_ENDPOINT="http://123.45.67.89:9000"
MINIO_ACCESS_KEY="shakti_storage_admin"
MINIO_SECRET_KEY="MySecureMinIOPass123!@#"
MINIO_BUCKET="shakti-yoga-assets"

# Next.js Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://shaktiyoga.com"

# Docker Compose Variables
POSTGRES_USER=shaktiyoga
POSTGRES_PASSWORD=MySecureDBPass123
POSTGRES_DB=shaktiyoga
MINIO_ROOT_USER=shakti_storage_admin
MINIO_ROOT_PASSWORD=MySecureMinIOPass123!@#
```

---

## 🆘 Troubleshooting

**Can't connect to database?**
- Check `DATABASE_URL` matches docker compose.yml `POSTGRES_PASSWORD`
- Verify PostgreSQL container is running: `docker ps | grep postgres`

**MinIO connection failed?**
- Check `MINIO_ENDPOINT` uses correct IP
- Verify MinIO container is running: `docker ps | grep minio`
- Check `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` match docker compose.yml

**App shows wrong URL?**
- Update `NEXT_PUBLIC_APP_URL` with your actual domain
- Rebuild: `npm run build`

