from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import re

get_bp = Blueprint('get_bp', __name__)
#mode production
conn_str = os.environ.get("DB_CREDENTIALS")


#Load DB credentials
if not conn_str:
    file_path= r"C:\Users\info\Desktop\myproject\Leaflet-Project\Project2\services\db.credentials"
    with open(file_path) as f:
        conn_str=f.readline().strip()

@get_bp.route('/get_layers', methods=['GET', 'POST'])
def get_layers():
    try:
        # Get query parameters
        table = request.args.get('table');
        # Sécuriser le nom de la table (éviter l'injection SQL)
        if not table or not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table):
            return "Invalid table name", 400

        # Connect to PostgreSQL
        pg_conn = psycopg2.connect(conn_str);
        pg_cur= pg_conn.cursor(cursor_factory=RealDictCursor)

        query = f"""
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(geom)::jsonb,
                        'properties', to_jsonb(t) - 'geom'
                    )
                ), '[]'::jsonb)
            )
            FROM (
                SELECT * FROM vector."{table}"
                WHERE geom IS NOT NULL
            ) AS t;
        """

        pg_cur.execute(query)

        row = pg_cur.fetchone()
        if row is None:
             return jsonify({"error": "No data found"}), 404
        records = list(row.values())[0]
        pg_cur.close()
        pg_conn.close()


        return jsonify(records)
    
    except Exception as e:
            import traceback
            traceback.print_exc()  # Affiche la stack trace dans la console
            return jsonify({"error": str(e)}), 500
        