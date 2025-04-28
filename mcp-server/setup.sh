# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_MIN_VERSION="18.0.0"
NODE_RECOMMENDED="20.0.0"

# ====================================================
# Utility functions
# ====================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

confirm() {
  read -p "$1 (y/n): " response
  case "$response" in
    [yY][eE][sS]|[yY])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Compare version numbers
version_compare() {
  # $1 = version1, $2 = version2
  # Returns:
  #   0 if version1 == version2
  #   1 if version1 > version2
  #   2 if version1 < version2
  if [[ "$1" == "$2" ]]; then
    return 0
  fi

  local IFS=.
  local i ver1=($1) ver2=($2)

  # Fill empty fields with zeros
  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
    ver1[i]=0
  done
  for ((i=${#ver2[@]}; i<${#ver1[@]}; i++)); do
    ver2[i]=0
  done

  # Compare version numbers field by field
  for ((i=0; i<${#ver1[@]}; i++)); do
    if [[ ${ver1[i]} -gt ${ver2[i]} ]]; then
      return 1
    fi
    if [[ ${ver1[i]} -lt ${ver2[i]} ]]; then
      return 2
    fi
  done

  return 0
}

get_version_number() {
  echo "$1" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -n 1
}

# ====================================================
# Check system dependencies
# ====================================================

check_system_dependencies() {
  log_info "Checking system dependencies..."

  local missing_deps=()

  # Check for tree command
  if ! command_exists tree; then
    missing_deps+=("tree")
  fi

  # Check for other required tools
  if ! command_exists curl; then
    missing_deps+=("curl")
  fi

  if [ ${#missing_deps[@]} -ne 0 ]; then
    log_warning "Missing system dependencies: ${missing_deps[*]}"

    # Attempt to install missing dependencies based on the OS
    if command_exists apt-get; then
      # Debian/Ubuntu
      log_info "Detected Debian/Ubuntu. Attempting to install dependencies..."
      if confirm "Do you want to install the missing dependencies?"; then
        sudo apt-get update
        sudo apt-get install -y "${missing_deps[@]}"
      else
        log_error "Cannot continue without required dependencies. Please install them manually."
        exit 1
      fi
    elif command_exists brew; then
      # macOS with Homebrew
      log_info "Detected macOS with Homebrew. Attempting to install dependencies..."
      if confirm "Do you want to install the missing dependencies?"; then
        brew install "${missing_deps[@]}"
      else
        log_error "Cannot continue without required dependencies. Please install them manually."
        exit 1
      fi
    elif command_exists yum; then
      # CentOS/RHEL
      log_info "Detected CentOS/RHEL. Attempting to install dependencies..."
      if confirm "Do you want to install the missing dependencies?"; then
        sudo yum install -y "${missing_deps[@]}"
      else
        log_error "Cannot continue without required dependencies. Please install them manually."
        exit 1
      fi
    elif command_exists pacman; then
      # Arch Linux
      log_info "Detected Arch Linux. Attempting to install dependencies..."
      if confirm "Do you want to install the missing dependencies?"; then
        sudo pacman -S --noconfirm "${missing_deps[@]}"
      else
        log_error "Cannot continue without required dependencies. Please install them manually."
        exit 1
      fi
    else
      log_error "Unsupported package manager. Please install these dependencies manually: ${missing_deps[*]}"
      exit 1
    fi

    # Verify installation
    for dep in "${missing_deps[@]}"; do
      if ! command_exists "$dep"; then
        log_error "Failed to install $dep. Please install it manually."
        exit 1
      fi
    done
  fi

  log_success "All system dependencies are installed."
}

# ====================================================
# Check and install Node.js
# ====================================================

check_node() {
  log_info "Checking Node.js installation..."

  local install_node=false
  local node_version=""

  if ! command_exists node; then
    log_warning "Node.js is not installed."
    install_node=true
  else
    node_version=$(get_version_number "$(node -v)")
    log_info "Detected Node.js version $node_version"

    # Check if version meets minimum requirements
    version_compare "$node_version" "$NODE_MIN_VERSION"
    local comp_result=$?

    if [ $comp_result -eq 2 ]; then
      log_warning "Node.js version $node_version is below the minimum required version ($NODE_MIN_VERSION)."
      install_node=true
    fi
  fi

  if [ "$install_node" = true ]; then
    if confirm "Do you want to install/upgrade Node.js (version $NODE_RECOMMENDED)?"; then
      install_nodejs
    else
      log_error "Cannot continue without Node.js >= $NODE_MIN_VERSION. Please install it manually."
      exit 1
    fi
  else
    log_success "Node.js is properly installed."
  fi

  # Verify npm is available
  if ! command_exists npm; then
    log_error "npm is not available even though Node.js is installed. Please fix your Node.js installation."
    exit 1
  fi
}

install_nodejs() {
  log_info "Installing Node.js..."

  # Determine the installation method based on OS
  if command_exists apt-get || command_exists yum || command_exists pacman; then
    # Linux - use nvm
    install_nodejs_nvm
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command_exists brew; then
      log_info "Installing Node.js using Homebrew..."
      brew install node@20 || {
        log_error "Failed to install Node.js via Homebrew."
        log_info "Trying with nvm instead..."
        install_nodejs_nvm
      }
      brew link --overwrite node@20 || true
    else
      log_info "Homebrew not found. Installing using nvm..."
      install_nodejs_nvm
    fi
  else
    log_error "Unsupported operating system. Please install Node.js manually."
    exit 1
  fi

  # Verify installation
  if ! command_exists node; then
    log_error "Failed to install Node.js. Please install it manually."
    exit 1
  fi

  node_version=$(get_version_number "$(node -v)")
  log_success "Node.js $node_version has been installed."
}

install_nodejs_nvm() {
  log_info "Installing Node.js using NVM..."

  # Check if nvm is already installed
  if [ -z "${NVM_DIR+x}" ]; then
    export NVM_DIR="$HOME/.nvm"
  fi

  if [ ! -d "$NVM_DIR" ]; then
    log_info "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  fi

  # Load nvm
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  if ! command_exists nvm; then
    log_error "Failed to install NVM. Please install Node.js manually."
    exit 1
  fi

  # Install Node.js
  nvm install "v$NODE_RECOMMENDED"
  nvm use "v$NODE_RECOMMENDED"
  nvm alias default "v$NODE_RECOMMENDED"
}

# ====================================================
# Build and setup the project
# ====================================================

setup_project() {
  log_info "Setting up the project..."

  # Navigate to project directory
  cd "$SCRIPT_DIR"

  # Install npm dependencies
  log_info "Installing npm dependencies..."
  npm install || {
    log_error "Failed to install npm dependencies."
    exit 1
  }
  log_success "Dependencies installed."

  # Build the project
  log_info "Building the project..."
  npm run build || {
    log_error "Failed to build the project."
    exit 1
  }
  log_success "Project built successfully."
}

# ====================================================
# Generate Claude configuration
# ====================================================

generate_claude_config() {
  log_info "Generating Claude desktop configuration..."

  # Full path to the built index.js
  local server_path="$SCRIPT_DIR/build/index.js"

  # Generate the configuration
  local config_file="$SCRIPT_DIR/claude-config.json"
  cat > "$config_file" << EOL
{
  "mcpServers": {
    "atlas-repo-server": {
      "command": "node",
      "args": [
        "${server_path}"
      ]
    }
  }
}
EOL

  log_success "Configuration generated at: $config_file"
  echo ""
  echo "------------------------------------------------------"
  echo "To use this server with Claude Desktop:"
  echo "1. Copy the contents of claude-config.json"
  echo "2. Add it to your Claude desktop configuration"
  echo "3. Restart Claude Desktop"
  echo "------------------------------------------------------"
}

# ====================================================
# Main function
# ====================================================

main() {
  echo "===================================================="
  echo "Atlas MCP Server Setup"
  echo "===================================================="

  check_system_dependencies
  echo ""

  check_node
  echo ""

  # Explicitly continue with the rest of the setup
  log_info "Continuing with project setup..."
  setup_project
  echo ""

  log_info "Generating configuration..."
  generate_claude_config
  echo ""

  log_success "Setup completed successfully!"
  echo ""
  echo "------------------------------------------------------"
  echo "To use this server with Claude Desktop:"
  echo "1. Copy the contents of claude-config.json"
  echo "2. Add it to your Claude desktop configuration"
  echo "3. Or directly use this configuration file path in Claude settings"
  echo "4. Restart Claude Desktop"
  echo "------------------------------------------------------"
}

# Run the script
main
