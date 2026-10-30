Commit every change you make locally and push your commits to `origin`.
After completing the task and passing the required checks, you may merge your
changes into the repository's default branch and push the merge to `origin`.

Use the following commit message format:

`<type>(<scope>): <description>`

Example: `add(track): add jungle track`

Branches created by AI must use the format `ai/<description>`.

Example: `ai/add-jungle-track`

You may use an available GitHub token from the `GITHUB_TOKEN` or `GH_TOKEN`
environment variable, or the repository-root `GITHUB_TOKEN` file, for GitHub
operations needed to complete the task. Never print token values or include
them in logs, messages, or commits. Keep local token files ignored by Git.
Respect branch protection: use pull requests and merge only after all required
checks pass.
