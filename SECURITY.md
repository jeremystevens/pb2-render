# Security Policy

## Supported Versions

The following table shows the status of security updates for this project.

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Yes             |
| < 1.0   | ❌ No              |

Only the latest stable release will receive security updates and patches.

## Reporting a Vulnerability

If you discover a security vulnerability in `pb2-render`, please help us keep the project and its users safe by following the steps below:

1. **Do not open a public issue.**
2. Email the maintainer at [jeremy@jeremystevens.name](mailto:jeremiahstevens@gmail.com) with a detailed description of the vulnerability.
3. Include the following in your report (if available):
   - Steps to reproduce the vulnerability.
   - Any known exploits.
   - Your suggestions for a possible fix or workaround.

We aim to respond to vulnerability reports within **72 hours** and will work with you to assess the issue and develop a fix if appropriate.

## Disclosure Policy

Once a vulnerability has been addressed and a fix is released:
- A GitHub security advisory may be published.
- Users will be notified via the changelog and release notes.
- The reporter may be credited if desired.

## Security Best Practices

While this tool is not intended to be exposed to untrusted inputs in production systems, users should:
- Avoid rendering `.proto` files from unknown or untrusted sources.
- Always use the latest version of `pb2-render`.
- Review and sandbox input handling if using this tool in automated pipelines.

---

For any questions related to security, please contact us via the above email address.

