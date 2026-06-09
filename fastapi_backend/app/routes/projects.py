import json
from uuid import UUID
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import User, get_async_session, create_db_and_tables
from app.users import current_active_user
from app.models import MainPipeline, DocPipelines, Paragraph, Retrieval, Embedding, SavedProjects, ProjectData

from typing import List, Dict, Any
from uuid import uuid4
from copy import copy

router = APIRouter(tags=["projects"])




# ========= EXPORT PROJECT =================

async def copy_rows_to_project(
    db_model,
    pk_name,
    user_id,
    source_project_id: UUID,
    target_project_id: UUID,
    db,
) -> None:

    rows, columns = await db_model.get_all(
        where_dict={"user_id": user_id, "project_id": source_project_id},
        db=db,
    )

    for row in rows:
        if row:
            data_dict: dict[str, Any] = dict(row)
            data_dict.pop(pk_name, None)
            data_dict["project_id"] = target_project_id
            print("DEBUG INSERT:", {k: (v, type(v)) for k, v in data_dict.items()})
            await db_model.insert_data(data_dict=data_dict, db=db)

    await db.commit()


async def copy_project_data(db, user_id, source_id, target_id):


    # ===================================================

    for db_model, pk_name in [(MainPipeline, "id"), (DocPipelines, "id"), (Paragraph, "paragraph_id"),
                           (Retrieval, "retrieval_id"), (Embedding, "embedding_id")]:
        await copy_rows_to_project(
            db_model,
            pk_name,
            user_id=user_id,
            source_project_id=source_id,
            target_project_id=target_id,
            db=db,
        )




class ExportBody(BaseModel):
    name: str
    project_id: str


@router.post("/export/")
async def export_project(
    body: ExportBody,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    # first define new target_id
    export_name = body.name

    new_row = await SavedProjects.insert_data(
        data_dict={"user_id": user.id, "name": export_name, "kind": "exported"},
        db=db,
    )

    await db.commit()
    await db.refresh(new_row)

    target_id = new_row.project_id
    # ===================================================
    # then copy all project data from project_id to target_id
    source_id = UUID(body.project_id)

    print(f"source and target project_ids (exporting): {source_id}, {target_id}")

    await copy_project_data(db, user.id, source_id, target_id)


    #await db.commit()

    return {"status": "ok"}



class LoadProjectBody(BaseModel):
    source_id: str
    target_id: str

@router.post("/load/")
async def load_project(
    body: LoadProjectBody,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    source_id = UUID(body.source_id)
    target_id = UUID(body.target_id)
    print(f"source and target project_ids (exporting): {source_id}, {target_id}")

    await copy_project_data(db, user.id, source_id, target_id)


    await db.commit()

    return {"status": "ok"}





class ProjectResponse(BaseModel):
    name: str
    project_id: UUID


@router.get("/list/saved/", response_model=List[ProjectResponse])
async def list_saved_projects(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await SavedProjects.get_all(columns=["project_id", "name"], where_dict={"kind": "saved", "user_id": user.id}, db=db) #"path": None

    print([(type(row["project_id"]), row["project_id"]) for row in rows])

    return [
        ProjectResponse(
            project_id=str(row["project_id"]),
            name=row["name"],
        )
        for row in rows
    ]


@router.get("/list/exported/", response_model=List[ProjectResponse])
async def list_exported_projects(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await SavedProjects.get_all(columns=["project_id", "name"], where_dict={"kind": "exported", "user_id": user.id}, db=db) #"path": None

    return [
        ProjectResponse(
            project_id=str(row["project_id"]),
            name=row["name"],
        )
        for row in rows
    ]



@router.post("/")
async def create_project(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await SavedProjects.get_all(
        columns=["name"],
        where_dict={"user_id": user.id, "kind": "saved"},
        db=db,
    )

    numeric_names = [
        int(row.name)
        for row in rows
        if str(row.name).isdigit()
    ]

    name_id = str(max(numeric_names, default=0) + 1)

    new_row = await SavedProjects.insert_data(
        data_dict={
            "user_id": user.id,
            "name": name_id,
            "kind": "saved",
        },
        db=db,
    )

    await db.commit()

    return {
        "name": name_id,
        "project_id": str(new_row.project_id),
    }


@router.post("/set/{project_id}")
async def set_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await ProjectData.get_row(where_dict={"user_id": user.id}, db=db)


    if row:
        row.current_id = project_id
    else:
        row = await ProjectData.insert_data(
            data_dict={
                "user_id": user.id,
                "current_id": project_id,
            },
            db=db,
        )

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }


# ========================= DELETE ==============================


async def delete_project_data(db, user_id, project_id):
    where_dict = {"user_id": user_id, "project_id": project_id}

    for model in (MainPipeline, DocPipelines, Paragraph, Retrieval, Embedding):
        await model.delete_data(db=db, where_dict=where_dict)



@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):


    row = await SavedProjects.get_row(
        where_dict={
            "user_id": user.id,
            "project_id": project_id,
        },
        db=db,
    )

    if row:
        await db.delete(row)
        await db.commit()

    # ==========================

    await delete_project_data(db, user.id, project_id)

    return {"message": "Doc Pipeline deleted"}



# ===================== EVALUATOR ================================
MethodSpec = Dict[str, Any]

@router.get("/evaluator/", response_model=MethodSpec)
async def read_evaluator(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await ProjectData.get_row(where_dict={"user_id": user.id}, db=db)

    if row is None or row.evaluator is None:
        # Return default empty evaluator if none exists
        return {}

    evaluator = json.loads(row.evaluator)

    return evaluator



@router.post("/evaluator/")
async def add_evaluator(
    evaluator: MethodSpec,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    row = await ProjectData.get_row(where_dict={"user_id": user.id}, db=db)


    if row:
        row.evaluator = json.dumps(evaluator)
    else:
        row = await ProjectData.insert_data(
            data_dict={
                "user_id": user.id,
                "evaluator": json.dumps(evaluator),
            },
            db=db,
        )

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }