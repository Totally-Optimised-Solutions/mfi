# india-geodata — Administrative Minified CDN

Source: `yashveeeeeeer/india-geodata` (CC BY 4.0 / CC0 per `data/administrative/*/metadata.json`), pinned commit `@2884453`, CRS EPSG:4326.

Hierarchy: `Country (1) → State/UT (36, tag admin/states) → Division → District (~760, admin/districts, Census 2011 + LGD, props {district, dt_code, st_nm, st_code, year:2011_c}) → Subdistrict (~6k, admin/subdistricts) → Block → Panchayat → Village (600k) → Habitation`.

Target: `https://tosin.b-cdn.net/india-geodata/v1/administrative/` on Bunny Storage Zone `toscdn` (`https://de-s3.storage.bunnycdn.com`, Frankfurt).
Layout: `country.min.geojson.gz`, `states.min.geojson.gz`, `districts.min.geojson.gz`, `districts/by-state/<slug>.min.geojson.gz`, `subdistricts/...`, `blocks/...`, `panchayats/...`, `villages/by-state/...` (sharded, never single file), `divisions.min.geojson.gz`, `lookup/*.min.json.gz`, `manifest.json`. Each with `Content-Encoding: gzip` + `.br`, `Cache-Control: public, max-age=31536000, immutable`, sha in manifest.

Build: `scripts/build_admin_geodata_cdn.py` — host-validated fetch (allow only http/https, `socket.getaddrinfo` reject private/loopback/link_local/reserved/multicast/unspecified, allowlist raw.githubusercontent.com, github.com, api.github.com, cdn.jsdelivr.net, objects.githubusercontent.com → target de-s3.storage.bunnycdn.com, tosin.b-cdn.net). Downloads via `raw.githubusercontent.com/.../main/...` (small) and `gh release download <tag> --repo yashveeeeeeer/india-geodata` (large). Converts `parquet/shapefile/geojsonl.7z → GeoJSON` (geopandas/pyarrow/shapely), simplifies (0.0005–0.001 states/districts, 0.0002 villages), quantizes 5 decimals, `json.dumps(separators=(',',':'))`, `gzip -9` + `brotli -q 11`. Credentials at runtime only via `[[bunny-cdn-toscdn]]` env/secret (`BUNNY_S3_ACCESS_KEY_ID` / `BUNNY_S3_SECRET_ACCESS_KEY` or `frappe.conf` or `Bunny CDN Settings` Password `get_password`), fail-closed, never literal `toscdn`.

Pilot: `states.min.geojson.gz` + `districts.min.geojson.gz` + `districts/by-state/maharashtra.min.geojson.gz` (<500KB gz) first, verified via `curl -I` + `gunzip | jq '.features|length'` (36 / 760 / 35).
