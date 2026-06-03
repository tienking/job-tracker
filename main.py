from fastapi import FastAPI
from api import router

app = FastAPI(title="Job Tracker API")
app.include_router(router)
