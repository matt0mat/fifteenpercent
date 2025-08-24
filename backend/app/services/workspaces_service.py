# backend/app/services/workspaces_service.py
from __future__ import annotations

import logging
import uuid
from typing import List, Optional, Tuple, Dict, Any

import psycopg
from psycopg.rows import dict_row

from backend.app.db.connection import get_conn

log = logging.getLogger("workspaces_service")


def create(tenant_id: str, name: str) -> Optional[Dict[str, Any]]:
    """
    Creates a new workspace in the database.
    """
    sql = """
    INSERT INTO playgrounds (id, tenant_id, name)
    VALUES (%s, %s, %s)
    RETURNING id, tenant_id, name, created_at
    """
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, (str(uuid.uuid4()), tenant_id, name))
                return cur.fetchone()
    except Exception as e:
        log.error("Failed to create workspace for tenant %s: %s", tenant_id, e)
        return None


def list_for_tenant(tenant_id: str) -> List[Dict[str, Any]]:
    """
    Lists all workspaces for a given tenant.
    """
    sql = """
    SELECT id, tenant_id, name, created_at FROM playgrounds
    WHERE tenant_id = %s
    ORDER BY created_at DESC
    """
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, (tenant_id,))
                return cur.fetchall()
    except Exception as e:
        log.error("Failed to list workspaces for tenant %s: %s", tenant_id, e)
        return []

# Placeholder for future functions
def add_document(workspace_id: uuid.UUID, doc_data: Dict) -> Optional[Dict]:
    """
    Adds a document reference to a workspace.
    """
    # TODO: Implement this function
    log.info("Add document to workspace %s", workspace_id)
    return None

def find_documents(workspace_id: uuid.UUID) -> List[Dict]:
    """
    Finds documents within a workspace.
    """
    # TODO: Implement this function
    log.info("Find documents in workspace %s", workspace_id)
    return []