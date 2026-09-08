import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.here_routing import router as here_router
from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.digital_twin import router as digital_twin_router
from app.api.emergency import router as emergency_router
from app.api.health import router as health_router
from app.api.incidents import router as incidents_router
from app.api.predictions import router as predictions_router
from app.api.signals import router as signals_router
from app.api.simulations import router as simulations_router
from app.api.sumo import router as sumo_router
from app.api.traffic import router as traffic_router
from app.api.ws_traffic import router as ws_router
from app.api.yolo_vision import router as yolo_router
from app.api.ws_yolo import router as ws_yolo_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler, unhandled_error_handler
from app.core.logging_config import logger, setup_logging

setup_logging(debug=settings.DEBUG)

app = FastAPI(title=settings.APP_NAME, docs_url="/docs" if settings.DEBUG else None, redoc_url=None)

# Comprehensive CORS Configuration for Vercel & Localhost
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://bharat-traffic-win.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(Exception, unhandled_error_handler)

app.include_router(here_router)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(traffic_router)
app.include_router(digital_twin_router)
app.include_router(predictions_router)
app.include_router(signals_router)
app.include_router(simulations_router)
app.include_router(emergency_router)
app.include_router(incidents_router)
app.include_router(analytics_router)
app.include_router(sumo_router)
app.include_router(ws_router)
app.include_router(yolo_router)
app.include_router(ws_yolo_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s -> %d (%.1fms)", request.method, request.url.path, response.status_code, duration_ms)
    return response
