from src.sandbox.factory import get_sandbox
from src.sandbox.local import LocalSandbox
from src.sandbox.docker_exec import DockerSandbox


def test_factory_default_local(monkeypatch):
    monkeypatch.delenv("SANDBOX_TYPE", raising=False)
<<<<<<< HEAD
=======
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("SANDBOX_ALLOW_LOCAL", raising=False)
>>>>>>> desktop-sync-20260401
    s = get_sandbox()
    assert isinstance(s, LocalSandbox)


<<<<<<< HEAD
=======
def test_factory_production_defaults_to_docker(monkeypatch):
    monkeypatch.delenv("SANDBOX_TYPE", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("SANDBOX_ALLOW_LOCAL", raising=False)
    s = get_sandbox()
    assert isinstance(s, DockerSandbox)


>>>>>>> desktop-sync-20260401
def test_factory_docker_resolution(monkeypatch):
    # When docker is requested, factory should return DockerSandbox instance
    monkeypatch.setenv("SANDBOX_TYPE", "docker")
    s = get_sandbox()
    assert isinstance(s, DockerSandbox)
