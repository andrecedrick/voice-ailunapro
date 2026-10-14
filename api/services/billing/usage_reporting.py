"""Bridge between a completed workflow run and the Stripe billing meter.

Kept apart from `stripe_billing` so the Stripe client has no dependency on the
run model, and the completion task has no dependency on the Stripe transport.
"""

from typing import Any

from loguru import logger

from api.db import db_client
from api.enums import WorkflowRunMode
from api.services.billing.stripe_billing import is_enabled, report_run_minutes


def _duration_seconds(workflow_run) -> float | None:
    usage_info: dict[str, Any] = getattr(workflow_run, "usage_info", None) or {}
    try:
        duration = float(usage_info.get("call_duration_seconds"))
    except (TypeError, ValueError):
        return None
    return duration if duration > 0 else None


def _organization_id(workflow_run) -> int | None:
    workflow = getattr(workflow_run, "workflow", None)
    return getattr(workflow, "organization_id", None)


async def report_completed_workflow_run_to_stripe(workflow_run_id: int) -> None:
    """Report one completed run's platform minutes to Stripe.

    Text chat is excluded: it consumes no voice minutes, which is what the
    meter measures.
    """
    if not is_enabled():
        return

    workflow_run = await db_client.get_workflow_run_by_id(workflow_run_id)
    if not workflow_run:
        logger.warning(
            "Stripe usage report skipped: workflow run {} not found", workflow_run_id
        )
        return

    if getattr(workflow_run, "mode", None) == WorkflowRunMode.TEXTCHAT.value:
        return

    if not getattr(workflow_run, "is_completed", False):
        logger.warning(
            "Stripe usage report skipped: workflow run {} is not completed",
            workflow_run_id,
        )
        return

    organization_id = _organization_id(workflow_run)
    if organization_id is None:
        logger.warning(
            "Stripe usage report skipped for run {}: no organization", workflow_run_id
        )
        return

    duration = _duration_seconds(workflow_run)
    if duration is None:
        logger.info(
            "Stripe usage report skipped for run {}: no billable duration",
            workflow_run_id,
        )
        return

    await report_run_minutes(
        organization_id=organization_id,
        duration_seconds=duration,
        workflow_run_id=workflow_run_id,
    )
