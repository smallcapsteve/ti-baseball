# Deploy TI Baseball to a DigitalOcean droplet

This is a static site (HTML/CSS/JS only). Hosting it on a droplet means
nginx serves the files directly, GitHub Actions rsyncs new versions on
every push to `main`, and Let's Encrypt handles the HTTPS cert.

## Your specifics (already filled in)

| Thing | Value |
| ----- | ----- |
| Domain | `tibaseball.com` (registered at Cloudflare) |
| Target droplet | `ubuntu-s-1vcpu-1gb-nyc3-01` |
| Droplet IPv4 | `45.55.218.57` |
| Deploy user (will be created) | `deploy` |
| Web root | `/var/www/tibaseball` |
| GitHub repo name | `ti-baseball` |

Plan at a glance:

1. Pick the droplet, point DNS at it, push code to GitHub.
2. SSH to the droplet, run `scripts/bootstrap-droplet.sh` once.
3. Add four secrets to the GitHub repo. From here on, every push deploys.

You only do steps 1–3 once. After that it's `git push` and the site updates.

---

## Step 1 — Create the GitHub repo and push the code

On your laptop:

```bash
cd /path/to/ti-baseball

# initialise git
git init -b main
git add .
git commit -m "Initial TI Baseball site"

# create the GitHub repo (using gh CLI) — or create it via github.com and copy the URL
gh repo create ti-baseball --private --source=. --remote=origin --push
```

If you don't have the `gh` CLI, create the repo on github.com, then:

```bash
git remote add origin git@github.com:YOUR_USERNAME/ti-baseball.git
git push -u origin main
```

That push will trigger the deploy workflow, but it'll fail until you've
finished steps 2 and 3 (it has nowhere to send the files yet). That's fine.

---

## Step 2 — Bootstrap the droplet

### 2a. Generate an SSH key pair for the deploy

This key lives in **GitHub Actions only**. It's not your personal key.

On your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tibaseball_deploy -C "tibaseball-deploy" -N ""
```

You now have two files:
- `~/.ssh/tibaseball_deploy.pub` — the public key (goes on the droplet)
- `~/.ssh/tibaseball_deploy` — the private key (goes into GitHub secrets)

### 2b. SSH into the droplet

```bash
ssh root@YOUR_DROPLET_IP   # or use your existing admin user
```

### 2c. Copy the repo onto the droplet, just for the bootstrap

Easiest: `git clone` the repo to the droplet so the bootstrap script can
read the nginx config it needs.

```bash
cd /tmp
git clone https://github.com/YOUR_USERNAME/ti-baseball.git
cd ti-baseball
```

### 2d. Edit and run the bootstrap script

```bash
nano scripts/bootstrap-droplet.sh
```

At the top, fill in:
- `DOMAIN="tibaseball.com"`                          — no protocol, no www.
- `DEPLOY_PUBKEY="ssh-ed25519 AAAA... tibaseball-deploy"`  — paste the contents of `~/.ssh/tibaseball_deploy.pub`

Save and run:

```bash
sudo bash scripts/bootstrap-droplet.sh
```

The script will:
- Install nginx, certbot, rsync if missing
- Create a `deploy` user the workflow will SSH as
- Install your deploy public key on that user
- Set up the nginx vhost
- Optionally run certbot for SSL (only if your domain's DNS already points at the droplet)

If your DNS isn't pointed at the droplet yet, answer **no** to the certbot
prompt and run it later with:

```bash
sudo certbot --nginx -d tibaseball.com -d www.tibaseball.com
```

---

## Step 3 — Buy the domain and point DNS

1. Buy `tibaseball.com` at [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/).
2. In the Cloudflare dashboard, go to the domain's **DNS** tab.
3. Add two records:

   | Type | Name | Content | Proxy |
   | ---- | ---- | ------- | ----- |
   | A    | @    | `YOUR_DROPLET_IP` | DNS only (gray cloud) |
   | A    | www  | `YOUR_DROPLET_IP` | DNS only (gray cloud) |

   Keep proxy **off** (gray cloud) for now so Let's Encrypt's HTTP challenge
   works. You can flip it on (orange cloud) later if you want Cloudflare's CDN
   and DDoS protection in front of nginx.

4. Wait ~5–10 minutes for DNS to propagate, then check:

   ```bash
   dig +short tibaseball.com   # should print YOUR_DROPLET_IP
   ```

5. Now run certbot on the droplet if you skipped it earlier:

   ```bash
   sudo certbot --nginx -d tibaseball.com -d www.tibaseball.com
   ```

---

## Step 4 — Add GitHub Actions secrets

In the GitHub repo, go to **Settings → Secrets and variables → Actions →
New repository secret**, and add these four:

| Secret name        | Value |
| ------------------ | ----- |
| `DROPLET_HOST`     | the droplet's public IPv4 address (or `tibaseball.com` once DNS resolves) |
| `DROPLET_USER`     | `deploy` |
| `DEPLOY_PATH`      | `/var/www/tibaseball` |
| `SSH_PRIVATE_KEY`  | the *full* contents of `~/.ssh/tibaseball_deploy` (the private key — starts with `-----BEGIN OPENSSH PRIVATE KEY-----`) |

---

## Step 5 — Push to deploy

You're done. Make any edit and run:

```bash
git add -A
git commit -m "Update copy on the hero"
git push
```

Go to the **Actions** tab on GitHub to watch the deploy run. It takes ~30
seconds. Then visit `https://tibaseball.com` to see the change live.

---

## Common gotchas

- **First push fails with "Permission denied (publickey)":** the deploy
  public key isn't installed on the droplet under the deploy user. Either
  re-run the bootstrap script with the key set, or add it manually to
  `/home/deploy/.ssh/authorized_keys`.

- **First push fails with "Host key verification failed":** the workflow's
  `ssh-keyscan` step should handle this automatically; if it doesn't,
  check that `DROPLET_HOST` resolves (no `http://`, no trailing slash, no
  port).

- **Cert provisioning fails:** make sure DNS resolves to the droplet
  *first*. Cloudflare's proxy must be off (gray cloud) during cert issuance.

- **nginx serves the placeholder, not your site:** the deploy ran but
  rsynced to the wrong path. Check `DEPLOY_PATH` and the nginx `root`
  directive both point at `/var/www/tibaseball`.

- **`sudo nginx -s reload` asks for a password:** the `sudoers.d` snippet
  installed by the bootstrap is missing or malformed. Verify:
  ```
  sudo cat /etc/sudoers.d/deploy-nginx
  ```

## What lives where

```
ti-baseball/
├── .github/workflows/deploy.yml   # GitHub Actions deploy pipeline
├── nginx/tibaseball.conf          # nginx vhost (template)
├── scripts/bootstrap-droplet.sh   # one-time droplet setup
├── assets/, *.html, styles.css... # the actual site
├── DEPLOY.md                      # this file
└── README.md                      # site-level notes
```
