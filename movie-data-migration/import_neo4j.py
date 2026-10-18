
import os
import json
from dotenv import load_dotenv
from neo4j import GraphDatabase

# .env থেকে Neo4j configuration load
load_dotenv()

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")
DATABASE = os.getenv("NEO4J_DATABASE")

# Configuration check
if not all([URI, USERNAME, PASSWORD, DATABASE]):
    raise ValueError("Neo4j configuration missing in .env")

# JSON backup load
with open("movies_backup.json", "r", encoding="utf-8") as file:
    movies = json.load(file)

print("Total movies in backup:", len(movies))

# Neo4j connection
driver = GraphDatabase.driver(
    URI,
    auth=(USERNAME, PASSWORD)
)

try:
    driver.verify_connectivity()
    print("Neo4j connection successful!")

    with driver.session(database=DATABASE) as session:

        # Movie node-এর জন্য uniqueness constraint
        session.run("""
            CREATE CONSTRAINT movie_pinecone_id_unique IF NOT EXISTS
            FOR (m:Movie)
            REQUIRE m.pineconeId IS UNIQUE
        """).consume()

        # প্রতি batch-এ 100টি movie import
        batch_size = 100

        for start in range(0, len(movies), batch_size):
            batch = movies[start:start + batch_size]

            records = []

            for item in batch:
                metadata = item.get("metadata") or {}

                records.append({
                    "pineconeId": item["id"],
                    "title": metadata.get("title", ""),
                    "year": metadata.get("year"),
                    "director": metadata.get("director", ""),
                    "actors": metadata.get("actors", ""),
                    "genres": metadata.get("genres", ""),
                    "themes": metadata.get("themes", ""),
                    "awards": metadata.get("awards", ""),
                    "text": metadata.get("text", "")
                })

            result = session.run("""
                UNWIND $movies AS data
                MERGE (m:Movie {pineconeId: data.pineconeId})
                SET m.title = data.title,
                    m.year = data.year,
                    m.director = data.director,
                    m.actors = data.actors,
                    m.genres = data.genres,
                    m.themes = data.themes,
                    m.awards = data.awards,
                    m.text = data.text
                RETURN count(m) AS processed
            """, movies=records)

            result.consume()

            print(
                f"Processed {min(start + batch_size, len(movies))}"
                f"/{len(movies)} movies"
            )

    print("\nMovie import complete!")

finally:
    driver.close()
