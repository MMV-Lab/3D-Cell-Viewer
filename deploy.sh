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

# Get the current branch name
CURRENT_BRANCH=$(git branch --show-current)

# Checkout to the 'ft-create-deployment-script' branch if not already on it
if [ "$CURRENT_BRANCH" != "ft-create-deployment-script" ]; then
  echo "Switching to 'ft-create-deployment-script' branch..."
  git checkout ft-create-deployment-script
else
  echo "Already on 'ft-create-deployment-script' branch."
fi

# Pull the latest changes from the remote repository
echo "Pulling the latest changes from 'ft-create-deployment-script' branch..."
git pull origin ft-create-deployment-script

# Create a new release branch from the current branch
git checkout -b "$RELEASE_BRANCH"

# Optionally, push the new release branch to the remote repository (uncomment if needed)
# git push origin "$RELEASE_BRANCH"

# Set environment variables for the API and file storage server
export REACT_APP_API_URL="https://cellmigration.isas.de/api"
export REACT_APP_UPLOAD_FOLDER="https://cellmigration.isas.de/uploads"

# Create .htaccess file in the public directory
echo "Creating .htaccess file..."
cat > "$FRONTEND_DIR/public/.htaccess" << 'EOL'
# Enable rewrite engine
RewriteEngine On

# If the requested resource exists as a file or directory, serve it directly
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Otherwise, redirect all requests to index.html
RewriteRule ^ index.html [QSA,L]

# Set security headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"

EOL

# Proceed with the frontend deployment
echo "Starting frontend-only deployment..."

# Move to the frontend directory and install dependencies
echo "Installing npm dependencies..."
cd "$FRONTEND_DIR"
npm install

# Building the React Application
echo "Building and minifying the React app for production..."
NODE_ENV=production npm run build

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

# Copy .htaccess file
echo "Copying .htaccess file..."
sudo cp "$FRONTEND_DIR/public/.htaccess" "$WEB_SERVER_ROOT/.htaccess"

# Set correct ownership and permissions
echo "Changing ownership of the web server root directory to www-data user..."
sudo chown -R www-data:www-data "$WEB_SERVER_ROOT"

echo "Frontend deployment completed successfully."
