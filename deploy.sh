#!/bin/bash

# Exit the script if any command fails
set -e

# Configuration variables
PROJECT_DIR="."  # Frontend root remains in 3D-Cell-Viewer
FRONTEND_DIR="$PROJECT_DIR"
WEB_SERVER_ROOT="/var/www/vhosts/lsfm.isas.de"

# Generate a new release branch name with timestamp
RELEASE_BRANCH="release-$(date +'%Y%m%d%H%M%S')"

echo "Creating a new release branch: $RELEASE_BRANCH"

# Checkout to the deployment branch and pull the latest changes
echo "Checking out to the deployment branch and pulling the latest changes..."
git checkout make--it-load-gracefully
git pull origin make--it-load-gracefully

# Create a new release branch from the current branch
git checkout -b "$RELEASE_BRANCH"

# Optionally, push the new release branch to the remote repository (uncomment if needed)
# git push origin "$RELEASE_BRANCH"

# Set environment variables for the API and file storage server
export REACT_APP_API_URL="https://cellmigration.isas.de/api"
export REACT_APP_UPLOAD_FOLDER="https://cellmigration.isas.de/uploads"

# Proceed with the frontend deployment
echo "Starting frontend-only deployment..."

# Building the React Application
echo "Building React app..."
cd "$FRONTEND_DIR"
npm run build

# Check if the web server root directory exists, if not, create it
if [ ! -d "$WEB_SERVER_ROOT" ]; then
  echo "Directory $WEB_SERVER_ROOT does not exist. Creating it now..."
  sudo mkdir -p "$WEB_SERVER_ROOT"
  sudo chown -R www-data:www-data "$WEB_SERVER_ROOT"
  sudo chmod -R 755 "$WEB_SERVER_ROOT"
  echo "Directory $WEB_SERVER_ROOT created successfully."
fi

# Deploy the built React app
echo "Copying the React build files to the web server root..."
sudo rm -rf "$WEB_SERVER_ROOT"/*
sudo cp -r "$FRONTEND_DIR/build/"* "$WEB_SERVER_ROOT"

# Set correct ownership and permissions
echo "Changing ownership of the web server root directory to www-data user..."
sudo chown -R www-data:www-data "$WEB_SERVER_ROOT"

echo "Frontend deployment completed successfully."
