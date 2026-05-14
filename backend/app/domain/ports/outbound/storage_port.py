from abc import ABC, abstractmethod
from typing import Any, BinaryIO


class StoragePort(ABC):
    @abstractmethod
    async def upload_file(self, *, file: BinaryIO, file_key: str) -> str:
        pass

    @abstractmethod
    async def download_file(self, *, file_key: str) -> BinaryIO:
        pass

    @abstractmethod
    async def delete_file(self, *, file_key: str) -> None:
        pass
