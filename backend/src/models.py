from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str = Field()
