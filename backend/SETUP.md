# Backend virtual environment

The project interpreter is `backend/.venv/Scripts/python.exe`.

In PyCharm, choose **Settings → Project → Python Interpreter → Add Local Interpreter → Existing**, then select that file.

PowerShell activation:

```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
```

If PyPI access is blocked by the local network, run the install command again when network access is available. The virtual environment itself has already been created with Python 3.12.14.

