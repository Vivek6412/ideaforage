import asyncio
import asyncpg

async def main():
    try:
        # Connect to the default 'postgres' database to issue database creation commands
        conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
        try:
            await conn.execute('DROP DATABASE IF EXISTS ideaforge_test')
        except Exception as e:
            pass
        
        await conn.execute('CREATE DATABASE ideaforge_test')
        print("Test database 'ideaforge_test' created successfully!")
        await conn.close()
    except Exception as e:
        print(f"Failed to create test database: {e}")

if __name__ == '__main__':
    asyncio.run(main())
