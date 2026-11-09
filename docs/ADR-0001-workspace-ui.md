# ADR-0001: Keep Copyparty as the backend and replace only the browser experience

**Status:** Superseded by [ADR-0002](adr/ADR-0002-lan-gateway-loopback-services.md)
**Date:** 2026-11-09
**Decision owner:** Project maintainer

> This record describes the initial isolation decision. Its original port topology was replaced by ADR-0002; do not use the old port assignments as current deployment instructions.

## Context

The existing Copyparty web interface is functional but visually dated. The host already runs Copyparty on Windows 11 and exposes a read-only share to browser clients. The goal is a cleaner browser experience without risking the working backend, shared files, or permissions.

## Historical decision

Use the upstream Cool CopyParty Front codebase as an isolated local working fork, preserving its Git history and an upstream remote. Develop on zien/media-library-ui.

Retain the existing Copyparty HTTP API as the integration boundary. Preserve image, video, audio, and text preview capability, and make the UI reflect permissions returned by Copyparty.

The initial plan placed Copyparty on port 3923 and Next.js on port 3925. That topology is no longer current; see ADR-0002 for the accepted LAN Gateway and loopback arrangement.

## Options considered

### A. Modify the current Copyparty installation

Rejected. It couples frontend experimentation to a working file server and increases the chance of breaking the existing service or shared volume.

### B. Use a separate frontend against the existing Copyparty API

Selected. It creates an independently deployable browser experience while retaining Copyparty as the storage and permission backend.

### C. Replace Copyparty with another file server

Deferred. It would change authentication, permissions, deployment, and API contracts unnecessarily.

## Historical consequences

- The backend, shared directory, and Copyparty permission model remain the source of truth.
- The frontend can evolve independently.
- Browser-native media playback remains limited by the client's supported codecs and formats.
- The frontend must not represent read-only access as writable access.
- The upstream repository had no declared LICENSE at bootstrap; do not invent a license for upstream code.

## Supersession

The initial direct-port plan is superseded by ADR-0002. Current port assignments and deployment procedures are documented in ARCHITECTURE.md and DEPLOYMENT.md.
