# 后端项目环境

当前项目位于 `D:\Codex\projects\MuseumAI-Studio`，统一使用根目录 `.venv\Scripts\python.exe`，基于本机 Python 3.12.7。后端启动脚本也使用这个解释器；旧 `backend/.venv` 不再作为本项目默认环境。

在 PyCharm 中打开 `D:\Codex\projects\MuseumAI-Studio`，将项目解释器设为 `D:\Codex\projects\MuseumAI-Studio\.venv\Scripts\python.exe`。更多操作见 [`../docs/USER_GUIDE.md`](../docs/USER_GUIDE.md)。

如果需要重新安装依赖，在项目根目录执行：

```powershell
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
```
