#!/bin/bash
# Deploy script for job-tracker. Place on VPS at /usr/local/bin/deploy-job-tracker.sh
# (chmod +x). Triggered by GitLab CI/CD on push to main.
set -e

cd /root/job-tracker

git pull origin main

source job-tracker-venv/bin/activate
pip install -r requirements.txt --quiet

cd frontend
npm install --silent
npm run build
cd ..

systemctl restart jobtracker
