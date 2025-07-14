# 🗺️ Web Mapping Application

This is a full-stack web mapping application built with **OpenLayers (frontend)** and **Flask (backend)**. It connects to a **PostgreSQL/PostGIS** database to fetch vector layers dynamically and displays them with interactive map features.

## 🚀 Features

- ✅ **Basemap Switcher** — OpenStreetMap, OpenTopoMap, ESRI maps
- ✅ **Dynamic Layer Loading** — load GeoJSON layers from a PostGIS database
- ✅ **Interactive Popups** — show feature info on map click
- ✅ **Attribute Table** — display and filter layer data in a collapsible table
- ✅ **Dynamic Legend** — auto-generated color legend for each active layer

---

## 📦 Technologies

| Layer    | Stack                                           |
| -------- | ----------------------------------------------- |
| Frontend | HTML, CSS, JavaScript, OpenLayers, Font Awesome |
| Backend  | Python, Flask, psycopg2                         |
| Database | PostgreSQL + PostGIS                            |

---

## 📁 Project Structure

```bash
Geomap-App/
│
├── templates/
│ └── index.html # Frontend page with OpenLayers map
├── static/
│ ├── css/ # Styles for map and table
│ └── js/ # Main JS (init map, handlers, styles)
│
├── routes/
│ └── get_layers.py # Flask route to fetch GeoJSON from PostGIS
│
├── app.py # Main Flask app
└── requirements.txt # Python dependencies
```

---

## 🔌 PostgreSQL / PostGIS Setup

- Make sure your table is in a schema like `vector` and contains:

  - A `geometry` column (preferably named `geom`)
  - Additional attributes (e.g., `name`, `type`, etc.)

- Example SQL to expose your layer:

```sql
SELECT jsonb_build_object(
  'type', 'FeatureCollection',
  'features', jsonb_agg(
    jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJSON(geom)::jsonb,
      'properties', to_jsonb(row) - 'geom'
    )
  )
)
FROM (SELECT * FROM vector."your_table") AS row;

```

## Setup

1. **Install requirements**

   ```bash
   pip install -r requirement.txt
   ```

2. **Set your PostgreSQL connection string**
   -- In your get_layers.py

   ```bash
   conn_str = "host=localhost dbname=your_db user=your_user password=your_pass"
   ```

3. **Run Flask server**

   ```
   python app.py
   ```

   **Open your browser**

   ```
   http://127.0.0.1:5000
   ```

# 🧑‍💻 Author

Ouafae Saim
GIS Engineer | Web Developer
