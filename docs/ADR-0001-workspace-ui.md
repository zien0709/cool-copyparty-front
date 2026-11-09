# ADR-0001: Keep CopyParty as the backend and replace only the browser experience

**Status:** Accepted  
**Date:** 2026-11-09  
**Decision owner:** Project maintainer

## Context

The existing CopyParty web interface is functional but visually dated. The host already runs CopyParty on Windows 11 and exposes a read-only share to browser clients. The goal is a cleaner browser experience without risking the working backend, shared files, or permissions.

## Decision

Use the upstream Cool CopyParty Front codebase as an isolated local working fork, preserving its Git history and an `upstream` remote. Develop on `zien/media-library-ui`. Keep the CopyParty backend at port 3923 and run the new Next.js frontend separately on port 3925.

Retain the existing CopyParty HTTP API as the integration boundary. Preserve the current image, video, audio, and text preview capability, and make the UI reflect the permissions returned by CopyParty.

## Options considered

### A. Modify the current CopyParty installation

Rejected. It couples frontend experimentation to a working file server and increases the chance of breaking the existing service or shared volume.

### B. Use a separate frontend against the existing CopyParty API

Selected. It creates a rollback path: users can return to port 3923 without restoring files or reconfiguring the backend.

### C. Replace CopyParty with another file server

Deferred. It would change authentication, permissions, deployment, and API contracts unnecessarily.

## Consequences

- The backend, shared directory, and current CopyParty UI remain untouched.
- The new frontend can evolve independently and be stopped or removed without affecting port 3923.
- Browser-native media playback remains limited by the client's supported codecs and formats.
- The frontend must not expose upload, rename, or delete controls when CopyParty reports read-only access.
- The upstream repository had no LICENSE file at bootstrap; keep this as a private local working copy until usage and redistribution rights are clarified.

## Acceptance checks

- [ ] The original CopyParty process still listens on port 3923.
- [ ] The new frontend is isolated on port 3925.
- [ ] No existing files in `D:\Shared` are modified during UI checks.
- [ ] Read-only sessions show no write actions.
- [ ] Lint, typecheck, and production build pass.
