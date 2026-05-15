import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from mangum import Mangum

from api.database import engine
from api.models import Base
from api.errors import validation_exception_handler, http_exception_handler
from api.routers import auth, teams, tasks, messages


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="TaskFlow API", lifespan=lifespan)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(tasks.router)
app.include_router(messages.router)

handler = Mangum(app)
