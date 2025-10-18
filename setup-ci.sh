set -euo pipefail

mkdir -p .github/workflows .github/ISSUE_TEMPLATE

# .releaserc.json
cat > .releaserc.json <<'EOF'
{
  "branches": [
    "develop",
    { "name": "releases/v1.7", "range": "1.7.x", "channel": "1.7.x" }
  ],
  "plugins": [
    ["@semantic-release/commit-analyzer", { "preset": "conventionalcommits" }],
    ["@semantic-release/release-notes-generator", { "preset": "conventionalcommits" }],
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/github", { "assets": [{ "path": "dist/**" }] }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }]
  ]
}
EOF

# CI workflow
cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  pull_request:
    branches: [ develop ]
    paths-ignore:
      - 'README.md'
      - 'CHANGELOG.md'
      - 'docs/**'
      - '.github/**'
  push:
    branches: [ develop, 'feature/**' ]
    paths-ignore:
      - 'README.md'
      - 'CHANGELOG.md'
      - 'docs/**'
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run typecheck --if-present
      - run: npm test --if-present
      - run: npm run build --if-present
EOF

# Snapshot workflow
cat > .github/workflows/snapshot.yml <<'EOF'
name: Snapshot
on:
  push:
    branches: [ 'feature/**' ]
permissions:
  contents: write
concurrency:
  group: snapshot-${{ github.ref }}
  cancel-in-progress: true
jobs:
  snapshot-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Compute base version
        id: base
        run: |
          TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
          if [ -z "$TAG" ]; then TAG="v$(node -p "require('./package.json').version")"; fi
          echo "tag=${TAG#v}" >> $GITHUB_OUTPUT
      - name: Stamp -SNAPSHOT
        run: |
          BASE="${{ steps.base.outputs.tag }}"
          BASE=$(node -e "let v='${BASE}'; console.log(v.split('-')[0].split('+')[0])")
          SNAP="${BASE}-SNAPSHOT.${{ github.run_number }}+sha.${GITHUB_SHA::7}"
          node -e "let p=require('./package.json'); p.version='${SNAP}'; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git commit -am "chore(version): ${SNAP} [skip ci]" || echo "no changes"
          git push || true
      - run: npm run build --if-present
      - name: Upload build
        uses: actions/upload-artifact@v4
        with:
          name: snapshot-${{ github.ref_name }}
          path: |
            dist/**
            package.json
EOF

# Release workflow
cat > .github/workflows/release.yml <<'EOF'
name: Release
on:
  push:
    branches: [ develop ]
permissions:
  contents: write
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: true
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
      - name: Install release tooling
        run: |
          npm i -D semantic-release @semantic-release/git @semantic-release/github @semantic-release/changelog @semantic-release/npm @semantic-release/commit-analyzer @semantic-release/release-notes-generator
      - name: Semantic Release
        id: sr
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
      - name: Create/Update maintenance branch for this line
        run: |
          TAG=$(git describe --tags --abbrev=0)
          V=${TAG#v}
          MAJOR=$(echo $V | cut -d. -f1)
          MINOR=$(echo $V | cut -d. -f2)
          LINE="releases/v${MAJOR}.${MINOR}"
          echo "Maint line: $LINE from tag $TAG"
          if git show-ref --verify --quiet refs/heads/$LINE; then
            git branch -f $LINE $TAG
          else
            git branch $LINE $TAG
          fi
          git push -u origin $LINE --force
      - name: Advance main to released tag
        run: |
          TAG=$(git describe --tags --abbrev=0)
          git checkout -B main $TAG
          git push -u origin main --force
EOF

# Patch-release workflow
cat > .github/workflows/patch-release.yml <<'EOF'
name: Patch Release
on:
  push:
    branches: [ 'releases/v*' ]
permissions:
  contents: write
concurrency:
  group: patch-${{ github.ref }}
  cancel-in-progress: true
jobs:
  patch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
      - name: Install release tooling
        run: |
          npm i -D semantic-release @semantic-release/git @semantic-release/github @semantic-release/changelog @semantic-release/npm @semantic-release/commit-analyzer @semantic-release/release-notes-generator
      - name: Semantic Release (maintenance)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
EOF

# Issue templates
cat > .github/ISSUE_TEMPLATE/feature.yml <<'EOF'
name: Feature request
description: Propose a new capability
labels: ["type:feature", "status:ready"]
body:
  - type: input
    id: summary
    attributes:
      label: Summary
      placeholder: One sentence user value
    validations:
      required: true
  - type: textarea
    id: user_story
    attributes:
      label: User story
      description: As a <role>, I want <capability> so that <benefit>.
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      value: |
        - [ ] …
        - [ ] …
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      options: [P1, P2, P3]
EOF

cat > .github/ISSUE_TEMPLATE/bug.yml <<'EOF'
name: Bug report
description: Something isn’t working
labels: ["type:bug", "status:ready"]
body:
  - type: textarea
    id: expected
    attributes: { label: Expected behavior }
  - type: textarea
    id: actual
    attributes: { label: Actual behavior }
  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
      description: Be specific (inputs, env, logs)
  - type: input
    id: version
    attributes: { label: Affected version/build (tag/commit) }
EOF

# Release Drafter config + workflow
cat > .github/release-drafter.yml <<'EOF'
name-template: 'v$NEXT_PATCH_VERSION'
tag-template: 'v$NEXT_PATCH_VERSION'
categories:
  - title: 🚀 Features
    labels: ['type:feature']
  - title: 🐛 Fixes
    labels: ['type:bug']
  - title: 🧹 Chores
    labels: ['type:chore']
  - title: 🔐 Security
    labels: ['type:security']
change-template: '- $TITLE (#$NUMBER) @$AUTHOR'
no-changes-template: 'No changes'
EOF

cat > .github/workflows/release-drafter.yml <<'EOF'
name: Release Drafter
on:
  push:
    branches: [develop]
permissions:
  contents: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: release-drafter/release-drafter@v6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
EOF

# Dependabot
cat > .github/dependabot.yml <<'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "deps"
EOF

echo "✅ Files written. Next steps:"
echo "   git add ."
echo "   git commit -m 'ci: semantic-release + workflows + issues automation'"
echo "   git push -u origin develop"
