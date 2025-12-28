#!/bin/bash

# ============================================
# MenuQR - Branch Protection Setup Script
# ============================================
# This script configures branch protection rules using GitHub CLI
#
# Prerequisites:
#   - GitHub CLI installed (brew install gh)
#   - Authenticated with gh auth login
#   - Admin access to the repository
#
# Usage:
#   ./scripts/setup-branch-protection.sh
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
    echo -e "${RED}Error: Could not determine repository. Make sure you're in a git repository and authenticated with gh.${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}MenuQR - Branch Protection Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Repository: ${GREEN}$REPO${NC}"
echo ""

# Function to setup branch protection
setup_branch_protection() {
    local BRANCH=$1
    local APPROVALS=$2
    local STRICT=$3

    echo -e "${YELLOW}Setting up protection for branch: ${BRANCH}${NC}"

    # Create the protection rule
    gh api repos/$REPO/branches/$BRANCH/protection \
        -X PUT \
        -H "Accept: application/vnd.github+json" \
        --input - << EOF
{
    "required_status_checks": {
        "strict": $STRICT,
        "contexts": [
            "CI Success",
            "Frontend - Lint",
            "Frontend - Type Check",
            "Frontend - Build",
            "Frontend - Test",
            "Backend - Lint",
            "Backend - Type Check",
            "Backend - Build",
            "Backend - Test"
        ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
        "required_approving_review_count": $APPROVALS,
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true,
        "require_last_push_approval": true
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
}
EOF

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Branch protection configured for $BRANCH${NC}"
    else
        echo -e "${RED}✗ Failed to configure branch protection for $BRANCH${NC}"
        return 1
    fi
}

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${YELLOW}This script will configure branch protection for:${NC}"
echo "  - main (strict: requires 1 approval, all CI checks)"
echo "  - develop (requires 1 approval, CI Success check)"
echo ""

read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""

# Setup main branch
setup_branch_protection "main" 1 true

echo ""

# Setup develop branch (less strict)
echo -e "${YELLOW}Setting up protection for branch: develop${NC}"

gh api repos/$REPO/branches/develop/protection \
    -X PUT \
    -H "Accept: application/vnd.github+json" \
    --input - << EOF
{
    "required_status_checks": {
        "strict": false,
        "contexts": ["CI Success"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": false,
        "require_last_push_approval": false
    },
    "restrictions": null,
    "required_linear_history": false,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
}
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Branch protection configured for develop${NC}"
else
    echo -e "${RED}✗ Failed to configure branch protection for develop${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Branch protection setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify settings in GitHub: Settings → Branches"
echo "  2. Create a test PR to verify CI workflow runs"
echo "  3. Configure team reviewers in CODEOWNERS file"
