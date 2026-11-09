# Local Fork — CopySpace

## Purpose

This directory is an isolated working fork of the upstream Cool CopyParty Front project. It provides a modern browser UI for the existing CopyParty server without changing the original server installation.

## Repository layout

- Working copy: `D:\Github\Cool-CopyParty-Front-Fork`
- Working branch: `zien/media-library-ui`
- Upstream remote: `upstream` → `https://github.com/andrecrjr/cool-copyparty-front.git`
- Existing CopyParty backend: `http://192.168.50.72:3923` (unchanged)
- New frontend target: `http://192.168.50.72:3925`
- Shared data: `D:\Shared` (unchanged)

## Non-negotiable boundaries

1. Never edit, replace, stop, or reconfigure `D:\Copyparty` as part of frontend development.
2. Never alter the contents or permissions of `D:\Shared`.
3. Keep the new frontend on its own port and process.
4. Do not commit passwords, session cookies, API credentials, `.env*` files, or machine-specific secrets.
5. Keep CopyParty as the source of truth for authentication and permissions. The frontend must not imply write access where the server reports read-only access.
6. Browser clients remain browser-only; no companion desktop app is required.

## Git workflow

- Work on `zien/media-library-ui`, never directly on `main`.
- Keep `upstream` as the read-only source of upstream changes.
- Use Conventional Commit messages with one logical change per commit.
- Run lint, typecheck, and production build before marking a UI milestone complete.
- Do not push or publish a derivative fork until the upstream repository's licensing status is clarified. A LICENSE file was not present in the cloned repository at bootstrap.

## Current deployment boundary

The frontend is a separate Next.js process. The intended LAN URL is port 3925; the original CopyParty UI remains available on port 3923 as a fallback.
