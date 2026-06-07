FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY zton/ zton/
COPY server/ server/
COPY web/ web/
COPY main.py .

ENV PYTHONPATH=/app
ENV ZTON_WEB_PORT=8080
ENV ZTON_UDP_PORT=9999

EXPOSE 8080
EXPOSE 9999/udp

CMD ["python", "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8080"]
