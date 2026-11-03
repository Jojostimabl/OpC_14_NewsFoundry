FROM ghcr.io/astral-sh/uv:python3.13-bookworm
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev
COPY src/ ./src/
EXPOSE 8000
CMD ["sh", "-c", "uv run --locked --no-dev uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
