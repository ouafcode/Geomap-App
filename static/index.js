let mainMap = null;
let mainView = null;
let vectorLayer;

/**
 * Elements that make up the popup.
 */
const container = document.getElementById("popup");
const content = document.getElementById("popup-content");
const closer = document.getElementById("popup-closer");

const overlay = new ol.Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

// Bouton de fermeture
closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur(); // optionnel, pour retirer le focus
  return false;
};

function init() {
  //Define view
  mainView = new ol.View({
    extent: [3124925, -599644, 3537136, -158022],
    center: [3336467, -385622],
    minZoom: 6,
    maxZoom: 14,
    zoom: 9,
  });

  //Initialize the map
  mainMap = new ol.Map({
    controls: [],
    overlays: [overlay],
    target: "map" /*Set the target to the ID of the map*/,
    view: mainView,
  });

  let baseLayer = getBaseMap("osm");

  mainMap.addLayer(baseLayer);

  /***
   ADD vector layer ***/

  const layerMap = {}; //pour garder la trace de chaque couche

  // Fonction utilitaire pour générer une couleur aléatoire
  function getRandomColor() {
    return "#" + Math.floor(Math.random() * 18977215).toString(16);
  }

  /**
   *  Add Legend
   */
  function addLegendItem(tableName, stylesMap, type) {
    const legendList = document.getElementById("legend-list");
    const li = document.createElement("li");

    const style = stylesMap[type];
    let color = "red";

    if (type === "Point") {
      const image = style.getImage();
      if (image && image.getStroke()) {
        color = image.getStroke().getColor(); // fallback to stroke
      }
    } else if (style.getStroke()) {
      color = style.getStroke().getColor();
    }

    li.id = `legend-${tableName}`;
    li.innerHTML = `
    <span class="legend-color" style="background-color:${color}"></span>
    ${tableName} (${type})
  `;
    legendList.appendChild(li);
  }
  function removeLegendItem(tableName) {
    const item = document.getElementById(`legend-${tableName}`);
    if (item) item.remove();
  }

  /**
   * Add Attribute table
   */
  function addAttibuteTable(tableName, features) {
    const container = document.getElementById("attribute-tables");

    //Remove old Table
    const OldSection = document.getElementById("section-${tableName}");
    if (OldSection) OldSection.remove();

    // Create Collapsible section
    const section = document.createElement("details");
    section.id = `section-${tableName}`;
    section.open = true;

    const summary = document.createElement("summary");
    summary.textContent = `Attrubute table: ${tableName}`;
    section.appendChild(summary);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Filter rows ...";
    searchInput.className = "attribute-filter";
    section.appendChild(searchInput);

    //Create Table
    const table = document.createElement("table");
    table.id = `table-${tableName}`;
    table.classList.add("attribute-table");

    // // Add Caption
    // const caption = document.createElement("caption");
    // caption.textContent = `Attribute Table: ${tableName}`;
    // table.appendChild(caption);

    // Get the field name for the first feature

    const properties = features[0].getProperties();
    delete properties.geometry;
    const fields = Object.keys(properties);

    // Add Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    fields.forEach((field) => {
      const th = document.createElement("th");
      th.textContent = field;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // body
    const tbody = document.createElement("tbody");
    features.forEach((feature, index) => {
      const row = document.createElement("tr");
      row.dataset.featureId = index;
      const props = feature.getProperties();
      delete props.geometry;

      fields.forEach((field) => {
        const td = document.createElement("td");
        td.textContent = props[field];
        row.appendChild(td);
      });

      // On row click => zoom to feature
      row.addEventListener("click", () => {
        const geometry = feature.getGeometry();
        const extent = geometry.getExtent();
        mainMap.getView().fit(extent, { duration: 500, maxZoom: 16 });
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
    // filter logic
    searchInput.addEventListener("input", () => {
      const textFilter = searchInput.value.toLowerCase();
      const rows = tbody.querySelectorAll("tr");

      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(textFilter) ? "" : "none";
      });
    });
  }

  document
    .getElementById("layer-form")
    .addEventListener("change", async function (e) {
      if (e.target.name == "layer") {
        const tableName = e.target.value;

        if (e.target.checked) {
          const styles = {
            Point: new ol.style.Style({
              image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: "rgba(255, 0, 0, 0.1)" }),
                stroke: new ol.style.Stroke({ color: "red", width: 2 }),
              }),
            }),
            MultiPolygon: new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: getRandomColor(),
                width: 2,
              }),
              fill: new ol.style.Fill({ color: "rgba(212, 204, 204, 0.1)" }),
            }),
          };

          const styleFunction = function (feature) {
            const geoType = feature.getGeometry().getType();
            return (
              styles[geoType] ||
              new ol.style.Style({
                stroke: new ol.style.Stroke({ color: "black", width: 1 }),
              })
            );
          };
          fetch(`http://127.0.0.1:5000/get_layers?table=${tableName}`)
            .then((res) => res.json())
            .then((geojson) => {
              const features = new ol.format.GeoJSON().readFeatures(geojson, {
                featureProjection: "EPSG:3857",
              });
              const source = new ol.source.Vector({
                features: features,
              });

              vectorLayer = new ol.layer.Vector({
                source: source,
                style: styleFunction,
              });

              mainMap.addLayer(vectorLayer);
              layerMap[tableName] = vectorLayer;

              //Add Attribute
              addAttibuteTable(tableName, features);

              // Add Legend
              // 🔍 Detect geometry type dynamically from the first feature
              const firstFeature = features[0];
              const geometryType = firstFeature.getGeometry().getType();
              addLegendItem(tableName, styles, geometryType);
            })
            .catch((err) => console.error("Erreur chargement GeoJSON :", err));
        } else {
          if (layerMap[tableName]) mainMap.removeLayer(layerMap[tableName]);
          delete layerMap[tableName];
          removeLegendItem(tableName);

          const OldSection = document.getElementById(`section-${tableName}`);
          if (OldSection) OldSection.remove();
        }
      }
    });

  /***
   * Add Popup
   */
  mainMap.on("click", function (evt) {
    const feature = mainMap.forEachFeatureAtPixel(
      evt.pixel,
      function (feature, layer) {
        if (layer === vectorLayer) {
          return feature;
        }
      }
    );

    if (feature) {
      // Générer le contenu dynamiquement à partir des propriétés
      let props = feature.getProperties();
      delete props.geometry; // Ne pas afficher la géométrie

      let popupContent = "<h3>Attributs</h3><ul>";
      for (let key in props) {
        popupContent += `<li><strong>${key}:</strong> ${props[key]}</li>`;
      }
      popupContent += "</ul>";

      content.innerHTML = popupContent;
      overlay.setPosition(evt.coordinate);
    } else {
      overlay.setPosition(undefined); // cacher popup si aucun objet cliqué
    }
  });
}

/*
 * Zoom In/Out
 */
document.getElementById("zoom-out").onclick = function () {
  const view = mainMap.getView();
  const zoom = mainView.getZoom();
  view.setZoom(zoom - 1);
};

document.getElementById("zoom-in").onclick = function () {
  const view = mainMap.getView();
  const zoom = mainView.getZoom();
  view.setZoom(zoom + 1);
};
/*****/
function showPanel(id) {
  const panel = document.getElementById(id);
  panel.classList.toggle("d-none");
}

/* •  •  • */

function getBaseMap(name) {
  let baseMap = {
    osm: {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attributions: "",
    },
    otm: {
      url: "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
      attributions:
        "Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA)",
    },
    esri_wtm: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attributions:
        "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
    },
    esri_natgeo: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
      attributions:
        "Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC",
    },
    own: {
      url: "../b_tiles/{z}/{x}/{y}.png",
    },
  };

  let layer = baseMap[name];
  if (layer === undefined) {
    layer = baseMap["osm"];
  }

  return new ol.layer.Tile({
    name: "base",
    source: new ol.source.TileImage(layer),
  });
}

/* •  •  • */

//To remove current layer map

function removeLayerByName(map, layer_name) {
  let layerToRemove = null;
  map.getLayers().forEach(function (layer) {
    if (layer.get("name") != undefined && layer.get("name") === layer_name) {
      layerToRemove = layer;
    }
  });

  map.removeLayer(layerToRemove);
}

// event listner for radio button JQuery
$("input[name=basemap]").click(function (evt) {
  removeLayerByName(mainMap, "base");
  let baseLayer = getBaseMap(evt.target.value);
  mainMap.addLayer(baseLayer);
});

// Attente du DOM chargé avant lancement
document.addEventListener("DOMContentLoaded", init);
