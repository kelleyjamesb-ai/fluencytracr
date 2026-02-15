from src.tools.execution_tool import run_python_code


def test_run_python_code_success():
    result = run_python_code("print('hi')", timeout=5)
    assert "hi" in result


def test_run_python_code_error():
    result = run_python_code("raise Exception('bad')", timeout=5)
    assert "Error (exit_code=" in result


def test_run_python_code_invalid_timeout_falls_back_to_default():
    result = run_python_code("print('hi')", timeout=0)
    assert "hi" in result
