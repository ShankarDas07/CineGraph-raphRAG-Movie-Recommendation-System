
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# .env থেকে Neo4j credentials load
load_dotenv()

URI = os.getenv("NEO4J_URI")
USERNAME = os.getenv("NEO4J_USERNAME")
PASSWORD = os.getenv("NEO4J_PASSWORD")
DATABASE = os.getenv("NEO4J_DATABASE")

if not all([URI, USERNAME, PASSWORD, DATABASE]):
    raise ValueError("Neo4j configuration missing in .env")


def split_values(value):
    """Comma-separated metadata-কে পরিষ্কার list-এ convert করে."""
    if not value:
        return []

    return list(dict.fromkeys(
        item.strip()
        for item in str(value).split(",")
        if item.strip() and item.strip().lower() != "none"
    ))


def build_graph(tx):
    # 1. Director nodes এবং DIRECTED relationship
    tx.run("""
        MATCH (m:Movie)
        WHERE m.director IS NOT NULL AND trim(m.director) <> ''
        WITH m, trim(m.director) AS directorName
        MERGE (d:Director {name: directorName})
        MERGE (d)-[:DIRECTED]->(m)
    """).consume()

    # 2. Actor nodes এবং ACTED_IN relationship
    tx.run("""
        MATCH (m:Movie)
        WITH m, split(coalesce(m.actors, ''), ',') AS actorNames
        UNWIND actorNames AS actorName
        WITH m, trim(actorName) AS actorName
        WHERE actorName <> '' AND toLower(actorName) <> 'none'
        MERGE (a:Actor {name: actorName})
        MERGE (a)-[:ACTED_IN]->(m)
    """).consume()

    # 3. Genre nodes এবং IN_GENRE relationship
    tx.run("""
        MATCH (m:Movie)
        WITH m, split(coalesce(m.genres, ''), ',') AS genreNames
        UNWIND genreNames AS genreName
        WITH m, trim(genreName) AS genreName
        WHERE genreName <> '' AND toLower(genreName) <> 'none'
        MERGE (g:Genre {name: genreName})
        MERGE (m)-[:IN_GENRE]->(g)
    """).consume()

    # 4. Theme nodes এবং HAS_THEME relationship
    tx.run("""
        MATCH (m:Movie)
        WITH m, split(coalesce(m.themes, ''), ',') AS themeNames
        UNWIND themeNames AS themeName
        WITH m, trim(themeName) AS themeName
        WHERE themeName <> '' AND toLower(themeName) <> 'none'
        MERGE (t:Theme {name: themeName})
        MERGE (m)-[:HAS_THEME]->(t)
    """).consume()

    # 5. Award nodes এবং HAS_AWARD relationship
    # একাধিক award comma দিয়ে আলাদা করা আছে ধরে নেওয়া হচ্ছে।
    tx.run("""
        MATCH (m:Movie)
        WITH m, split(coalesce(m.awards, ''), ',') AS awardNames
        UNWIND awardNames AS awardName
        WITH m, trim(awardName) AS awardName
        WHERE awardName <> '' AND toLower(awardName) <> 'none'
        MERGE (a:Award {name: awardName})
        MERGE (m)-[:HAS_AWARD]->(a)
    """).consume()

    # 6. Import শেষে graph statistics
    result = tx.run("""
        MATCH (m:Movie)
        RETURN count(m) AS movies
    """).single()

    return result["movies"]


def main():
    print("Connecting to Neo4j...")

    driver = GraphDatabase.driver(
        URI,
        auth=(USERNAME, PASSWORD)
    )

    try:
        driver.verify_connectivity()
        print("Connection successful!")

        with driver.session(database=DATABASE) as session:
            movie_count = session.execute_write(build_graph)

        print("\nGraph construction complete!")
        print("Movie nodes found:", movie_count)
        print("Actor, Director, Genre, Theme and Award relationships processed.")
        print("Next: verify node and relationship counts in Neo4j.")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
