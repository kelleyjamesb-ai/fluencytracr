FROM python:3.11-slim

WORKDIR /app
RUN pip install --no-cache-dir google-cloud-bigquery
COPY glean_gce_transformer.py /app/glean_gce_transformer.py

ENTRYPOINT ["python", "/app/glean_gce_transformer.py"]
