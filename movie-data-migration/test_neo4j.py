
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

uri = os.getenv("NEO4J_URI")
username = os.getenv("NEO4J_USERNAME")
password = os.getenv("NEO4J_PASSWORD")
database = os.getenv("NEO4J_DATABASE")

if not all([uri, username, password, database]):
    raise ValueError("Neo4j configuration missing in .env")

driver = GraphDatabase.driver(
    uri,
    auth=(username, password)
)

try:
    driver.verify_connectivity()
    with driver.session(database=database) as session:
        result = session.run("RETURN 1 AS result")
        print("Test result:", result.single()["result"])
    print("Neo4j connection successful!")
finally:
    driver.close()
