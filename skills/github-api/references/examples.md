# GitHub CLI and API examples

Run shell examples in Bash with `gh` and an authorized session. Replace the
sample repository and numbers with the task's verified targets. API examples
pin REST version `2022-11-28`. GitHub currently supports this version through
March 10, 2028; check the official API-version documentation before changing
it.

## Authentication without revealing credentials

Prefer the existing `gh` session. If repository instructions authorize a local
ignored token file, load it only when no environment token exists, with shell
tracing disabled. Run this from the actual repository root containing that
file; linked worktrees may not contain it:

```bash
set +x
if [ -z "${GH_TOKEN:-}" ] && [ -z "${GITHUB_TOKEN:-}" ] && [ -f GITHUB_TOKEN ]; then
  git check-ignore -q GITHUB_TOKEN || exit 1
  export GH_TOKEN="$(cat GITHUB_TOKEN)"
fi
# Verify access using a minimal read, not a credential dump.
gh api --hostname github.com user --jq .login
```

Do not run this block in a traced/debug-logged session. Do not print the file
or its value. Existing environment credentials need no file fallback.

## Issues and exact PR heads

```bash
repo=OrbiterToad/td-racing
issue=153
pr=100
# Higher-level CLI is enough for ordinary inspection.
gh issue view "$issue" --repo "$repo" --json number,title,state,body,url
gh pr view "$pr" --repo "$repo" \
  --json number,state,isDraft,headRefOid,baseRefOid,baseRefName,reviewDecision,url

# Reuse the immutable head for checks and statuses; do not substitute a branch tip.
head_sha=$(gh api --hostname github.com "repos/$repo/pulls/$pr" --jq .head.sha)
gh api --hostname github.com -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' --paginate \
  "repos/$repo/commits/$head_sha/check-runs?per_page=100" \
  --jq '.check_runs[] | {name,status,conclusion,head_sha,details_url}'
gh api --hostname github.com --paginate \
  "repos/$repo/commits/$head_sha/statuses?per_page=100" \
  --jq '.[] | {context,state,sha,target_url}'
gh api --hostname github.com --paginate \
  "repos/$repo/pulls/$pr/reviews?per_page=100" \
  --jq '.[] | {id,user:.user.login,state,commit_id,submitted_at}'
```

Compare required contexts with current runs/statuses and their app identities;
old successes or an empty list do not establish readiness. Reviews can be
superseded or dismissed. Raw review counts do not establish effective approval;
use the repository's required-review rules and current PR review decision.
Refresh `.head.sha` after collecting evidence and discard it if the head moved.

## Default branch, protection, and rulesets

```bash
default_branch=$(gh api --hostname github.com "repos/$repo" --jq .default_branch)
# Python URL-encodes slash-containing branch names as one path component.
encoded_branch=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$default_branch")
gh api --hostname github.com "repos/$repo/branches/$encoded_branch/protection"
# Active rules applying to this branch, including rulesets.
gh api --hostname github.com --paginate \
  "repos/$repo/rules/branches/$encoded_branch?per_page=100"
# Includes inherited rulesets; inspect individual rulesets if details are needed.
gh api --hostname github.com --paginate \
  "repos/$repo/rulesets?includes_parents=true&per_page=100"
```

Protection/rules access can require additional repository permissions. Report
unknown policy when access fails; do not treat a 404 as permission to merge.
Fetch the verified remote default branch and record `git rev-parse FETCH_HEAD`
when establishing a local implementation base. Confirm the remote URL belongs
to the intended repository before fetching.

## Authorized updates (templates; do not run as read-only validation)

For an already authorized issue edit, write the intended full body to a UTF-8
file, compare it with a fresh issue body, and use:

```bash
gh issue edit "$issue" --repo "$repo" --body-file /absolute/path/issue-body.md
gh issue view "$issue" --repo "$repo" --json number,body,url
```

For a narrowly authorized API title update, prepare a JSON file containing only
the requested field, for example `{"title":"Approved issue title"}`. Refetch
and compare the current title before submitting; REST issue edits do not offer
a general compare-and-swap guarantee. Stop on unexpected concurrent changes.

```bash
gh api --hostname github.com --method PATCH \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "repos/$repo/issues/$issue" --input /absolute/path/issue-update.json \
  --jq '{number,title,html_url}'
```

For an authorized PR creation, first check for an existing PR for the exact
head repository/branch, then use `gh pr create --repo "$repo" --base "$default_branch"`
with explicit `--head`, `--title`, and `--body-file` arguments. For authorized
PR edits, use `gh pr edit` with the specific fields and `--body-file`. Read back
the PR afterward. Do not automatically retry a timed-out create operation.
No example here grants merge or review authority.

## Official references

- [GitHub CLI API options, pagination, methods, and input](https://cli.github.com/manual/gh_api)
- [REST authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)
- [REST API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)
- [REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)
- [Check runs for a ref](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)
- [Pull request reviews](https://docs.github.com/en/rest/pulls/reviews#list-reviews-for-a-pull-request)
- [Branch protection](https://docs.github.com/en/rest/branches/branch-protection#get-branch-protection)
- [Repository rules](https://docs.github.com/en/rest/repos/rules)
- [REST troubleshooting and rate limits](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api)
