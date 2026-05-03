"""
Celery task packages live under ``app.application.tasks``.

- ``email_tasks``: transactional email (invitations, etc.).
- ``audit_tasks``: append-only audit log rows (same shape as IAM audit events).

The worker process runs ``celery -A app.infrastructure.celery_app``; that module
imports this package’s task modules so decorators run and tasks are registered.
"""
