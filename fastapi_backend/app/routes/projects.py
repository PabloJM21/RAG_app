import json
from uuid import UUID
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import User, get_async_session, create_db_and_tables
from app.users import current_active_user
from app.models import MainPipeline, DocPipelines, Paragraph, Retrieval, Embedding, SavedProjects

from typing import List
from uuid import uuid4


router = APIRouter(tags=["projects"])




# ========= EXPORT PROJECT =================

async def copy_rows_to_project(
    model,
    user_id,
    source_project_id: int,
    target_project_id: int,
    db,
) -> None:

    rows, columns = await model.get_all(
        where_dict={"user_id": user_id, "project_id": source_project_id},
        db=db,
    )

    for row in rows:
        data_dict = dict(zip(columns, row))
        data_dict["project_id"] = target_project_id
        await model.insert_data(data_dict=data_dict, db=db)


async def copy_project_data(db, user_id, source_id, target_id):
    main_row = await MainPipeline.get_row(
        where_dict={"user_id": user_id, "project_id": source_id},
        db=db,
    )
    if main_row:
        main_row.project_id = target_id

    # ===================================================

    for model in (DocPipelines, Paragraph, Retrieval, Embedding):
        await copy_rows_to_project(
            model,
            user_id=user_id,
            source_project_id=source_id,
            target_project_id=target_id,
            db=db,
        )






class ExportBody(BaseModel):
    projectName: str
    project_id: int


@router.post("/export/")
async def export_project(
    body: ExportBody,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    # first define new target_id
    rows, _ = await SavedProjects.get_all(columns=["poject_id", "name"], where_dict={"user_id": user.id},
                                          db=db)
    target_id = max([row["project_id"] for row in rows]) + 1 # should be an integer


    # ===================================================
    # then copy all project data from project_id to target_id
    source_id = body.project_id

    await copy_project_data(db, user.id, source_id, target_id)



    # ===================================================


    # finally store target_id of exported project
    export_name = body.projectName

    await SavedProjects.insert_data(
        data_dict={"project_id": target_id, "name": export_name, "kind": "exported"}, where_dict={"user_id": user.id},
        db=db,
    )

    await db.commit()

    return {"status": "ok"}








@router.post("/load/")
async def load_project(
    source_id: int,
    target_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):


    await copy_project_data(db, user.id, source_id, target_id)


    await db.commit()

    return {"status": "ok"}





class ProjectResponse(BaseModel):
    projectName: str
    project_id: int


@router.get("/list/saved/", response_model=List[ProjectResponse])
async def list_saved_projects(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await SavedProjects.get_all(columns=["poject_id", "name"], where_dict={"kind": "saved", "user_id": user.id}, db=db) #"path": None

    return [
        ProjectResponse(
            project_id=int(row["project_id"]),
            projectName=row["name"],
        )
        for row in rows
    ]


@router.get("/list/exported/", response_model=List[ProjectResponse])
async def list_exported_projects(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await SavedProjects.get_all(columns=["poject_id", "name"], where_dict={"kind": "exported", "user_id": user.id}, db=db) #"path": None

    return [
        ProjectResponse(
            project_id=int(row["project_id"]),
            projectName=row["name"],
        )
        for row in rows
    ]



@router.post("/{project_id}")
async def create_project(
    project_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):


    await SavedProjects.insert_data(
        data_dict={"project_id": project_id, "name": project_id, "kind": "saved"}, where_dict={"user_id": user.id},
        db=db,
    )

    await db.commit()

    return {"status": "ok"}



# ========================= DELETE ==============================


async def delete_project_data(db, user_id, project_id):
    where_dict = {"user_id": user_id, "project_id": project_id}

    for model in (MainPipeline, DocPipelines, Paragraph, Retrieval, Embedding):
        await model.delete_data(db=db, where_dict=where_dict)



@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
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



