# Issue Tracker: Local Markdown

This repository uses the local Markdown issue tracker because the GitHub CLI and GitHub issue connector are not available in the current environment, even though the repository has a GitHub remote.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- The feature specification is `.scratch/<feature-slug>/spec.md`.
- Implementation issues are separate files under `.scratch/<feature-slug>/issues/`, numbered from `01`.
- Triage state is recorded with a `Status:` line near the top of issue files.
- Conversation history is appended under a `## Comments` heading.

## Publishing

When a skill says to publish to the issue tracker, create or update the relevant Markdown files under `.scratch/`.
