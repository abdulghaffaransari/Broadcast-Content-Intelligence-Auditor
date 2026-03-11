"""
Azure Blob Storage integration for persisting Broadcast Content Intelligence audit reports.
Reports are stored in a date-partitioned path: audit-reports/{YYYY/MM/DD}/{video_id}_report.txt
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from azure.storage.blob import BlobServiceClient, ContentSettings

logger = logging.getLogger("brand-guardian")

CONTAINER_NAME = "audit-reports"
CONTENT_TYPE = "text/plain; charset=utf-8"


def save_report_to_blob(
    report_content: str,
    video_id: str,
    report_generated_at: Optional[datetime] = None,
) -> Optional[str]:
    """
    Saves the audit report text to Azure Blob Storage.

    Path: audit-reports/{YYYY/MM/DD}/{video_id}_report.txt

    Args:
        report_content: Full report text to store.
        video_id: Video/asset identifier (used in blob name).
        report_generated_at: Time of report generation; used for date partition. Defaults to now (UTC).

    Returns:
        The blob URL on success, or None if storage is not configured or upload fails.
    """
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string or not connection_string.strip():
        logger.warning("AZURE_STORAGE_CONNECTION_STRING not set; skipping report upload to Blob Storage.")
        return None

    if report_generated_at is None:
        report_generated_at = datetime.now(timezone.utc)

    date_partition = report_generated_at.strftime("%Y/%m/%d")
    safe_video_id = (video_id or "unknown").replace("/", "_").strip() or "unknown"
    blob_name = f"{date_partition}/{safe_video_id}_report.txt"

    try:
        client = BlobServiceClient.from_connection_string(connection_string)
        container = client.get_container_client(CONTAINER_NAME)
        if not container.exists():
            container.create_container()
            logger.info("Created Blob container: %s", CONTAINER_NAME)

        blob_client = container.get_blob_client(blob_name)
        blob_client.upload_blob(
            report_content.encode("utf-8"),
            overwrite=True,
            content_settings=ContentSettings(content_type=CONTENT_TYPE),
        )
        url = blob_client.url
        logger.info("Saved audit report to Blob Storage: %s", blob_name)
        return url
    except Exception as e:
        logger.warning("Failed to save audit report to Blob Storage (%s): %s", blob_name, e)
        return None
