# Project notes

## Deploying to the server

The production checkout lives at `/var/www/jeen-event` and tracks `main`.
After changes are merged to `main`, deploy with:

```bash
cd /var/www/jeen-event && ./deploy.sh
```
