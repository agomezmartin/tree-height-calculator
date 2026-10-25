# Especificación matemática y arquitectura previa

## 1. Interpretación del clinómetro

El clinómetro no entrega grados directos, sino un porcentaje relativo a la tangente del ángulo:

- Si la lectura del clinómetro es `p %`, entonces `tan(θ) = p / 100`.
- Por tanto, `θ = atan(p / 100)`.
- La lectura se interpreta como una pendiente vertical sobre una distancia horizontal.

Esto es esencial: un valor de `50 %` no representa `50°`, sino que equivale a `atan(0,5) ≈ 26,565°`.

## 2. Convención de signos

Se adoptan estas convenciones:

- Distancia horizontal: siempre positiva.
- Pendiente del terreno en %:
  - positiva: la base del árbol está por encima del observador.
  - negativa: la base del árbol está por debajo del observador.
- Lectura del clinómetro:
  - positiva: la copa está por encima del plano horizontal del observador.
  - negativa: la copa está por debajo del plano horizontal del observador.

Si el terreno es plano, la diferencia de elevación de la base es 0.

## 3. Distancia horizontal frente a distancia sobre el terreno

### Método A: distancia horizontal

La distancia introducida por el usuario coincide con la proyección horizontal:

`D_h = D`.

### Método B: distancia sobre el terreno

La distancia medida sigue la pendiente del terreno:

`D_t = distancia medida sobre el terreno`

`θ_t = atan(P_t / 100)`

`D_h = D_t × cos(θ_t)`

Esto es correcto porque la componente horizontal de la distancia inclinada es `cos(θ_t)`.

## 4. Desnivel del terreno

La diferencia de elevación de la base del árbol respecto al punto de observación es:

`Δh_base = D_h × (P_t / 100)`

El signo se conserva según la convención anterior:

- `P_t > 0`: base más alta → `Δh_base > 0`
- `P_t < 0`: base más baja → `Δh_base < 0`

## 5. Altura relativa hasta la copa

Si el clinómetro mide la copa con un porcentaje `P_c`:

`θ_c = atan(P_c / 100)`

`Δh_copa = D_h × tan(θ_c) = D_h × (P_c / 100)`

Esta es la diferencia vertical entre el plano horizontal del observador y la copa.

## 6. Altura total del árbol

El árbol se mide desde la base del suelo hasta la copa. La altura del instrumento representa la altura del ojo del observador sobre el terreno en el punto de observación. Por tanto:

`H = h_ojo + Δh_copa - Δh_base`

donde:

- `h_ojo`: altura del instrumento / ojos del usuario.
- `Δh_copa`: diferencia vertical entre la línea de visión horizontal y la copa.
- `Δh_base`: diferencia vertical entre la base del árbol y el punto de observación.

Si la base está por encima del observador, `Δh_base > 0`, y la altura total es menor que `h_ojo + Δh_copa`.
Si la base está por debajo, `Δh_base < 0`, y la altura total aumenta.

## 7. Casos de validación

Se validan los siguiente escenarios:

- Suelo plano (`P_t = 0`): `Δh_base = 0`
- Suelo ascendente (`P_t > 0`): la base está más alta
- Suelo descendente (`P_t < 0`): la base está más baja
- Clinómetro positivo: la copa está por encima del observador
- Clinómetro negativo: la copa está por debajo del observador
- Distancia sobre terreno: se reduce primero a horizontal con `cos` antes del cálculo de altura

## 8. Decisiones de diseño y arquitectura

### Estructura propuesta

```text
calcula-arboles/
├── index.html
├── README.md
├── docs/
│   └── METODOLOGIA.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   ├── storage.js
│   └── excel.js
├── tests/
│   └── calculator.test.js
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── package.json
└── LICENSE
```

### Lógica separada

La lógica matemática debe estar en un módulo independiente, puro y comprobable:

- `convertPercentToRadians()`
- `calculateHorizontalDistance()`
- `calculateTerrainElevationDifference()`
- `calculateCrownElevation()`
- `calculateTreeHeight()`
- `validateMeasurement()`

### Almacenamiento

- Se usará `localStorage` para conservar mediciones en el navegador durante la sesión y permitir edición.
- El dato se exportará a Excel desde la colección en memoria y no dependerá de backend.
- Cada medición puede guardar la especie asociada usando el código IFN del catálogo MITECO, junto con el nombre científico y el nombre común. Si el registro es antiguo o no tiene especie, estos campos quedan nulos y la visualización sigue funcionando sin migración destructiva.
- Cada medición puede guardar `phytosanitaryStatus` con uno de los valores `good`, `acceptable`, `deficient` o `critical`. El campo es opcional; los registros antiguos sin este dato permanecen sin evaluar, se muestran como "Sin evaluar" y se exportan con una celda vacía.
- Cada medición puede guardar `trunkDiameters` como una lista ordenada de diámetros DAP numéricos, en centímetros, y `trunkIds` como una lista paralela con el ID persistente de cada tronco. Una lista vacía o una propiedad ausente significa que no se ha medido; el orden conserva la relación con el número mostrado en el formulario.

### Catálogo de especies y selector

El catálogo de referencia se almacena en [assets/species.json](../assets/species.json) y se importa como dato independiente de la lógica de interfaz. El formulario expone un selector con opción vacía de "Selecciona una especie" y el texto `Nombre científico — Nombre común` para cada entrada, manteniendo la identidad del catálogo por su código IFN.

### Estado fitosanitario

El formulario dispone de un desplegable opcional con los estados Bueno, Aceptable, Deficiente y Crítico, además de la opción inicial "Sin evaluar". Esta última se almacena como `null`, se presenta como "Sin evaluar" en la parrilla y se exporta como celda vacía. Los registros anteriores sin propiedad `phytosanitaryStatus` se siguen leyendo sin migración.

### DAP y árboles multitronco

El formulario admite un diámetro positivo por tronco, medido a 1,30 m sobre el nivel del suelo y expresado en centímetros. Se pueden añadir y quitar campos sin un máximo artificial. Los campos vacíos no representan troncos ni diámetros de cero; si todos están vacíos, se almacena `trunkDiameters: []`. Los valores se conservan como números ordenados por tronco, sin sumarlos ni calcular un diámetro equivalente. La parrilla numera cada diámetro y muestra `—` cuando no existen datos. La ausencia de la propiedad en registros antiguos también se trata como no medido.

### Exportación Excel

SheetJS en navegador mediante CDN genera un archivo `.xlsx` sin servidor de aplicación. Las hojas existentes `Mediciones` y `Troncos` se conservan con sus columnas, orden y comportamiento. Se añade `QGIS_Trunks`, hoja geográfica con nombres de columna estables en `snake_case` y una fila por cada diámetro informado. Esta hoja no crea filas para árboles sin diámetros ni para valores nulos o vacíos; los registros siguen disponibles en las hojas anteriores.

En `QGIS_Trunks`, `tree_id` corresponde al ID persistente del registro de inventario (`entry.id`), mientras que el nombre introducido por el usuario se exporta como `tree_label`. `trunk_id` se genera y persiste por tronco (`trunkIds`), por lo que no depende del orden de filas en Excel; el diámetro asociado se mantiene en `trunkDiameters`. Los registros antiguos que carecen de `trunkIds` usan como respaldo un ID determinista formado por el ID del registro y el índice original del diámetro. Al editar esos registros, la interfaz les asigna y guarda IDs de tronco persistentes.

La nueva hoja repite por tronco las coordenadas y demás atributos del registro (especie, estado fitosanitario, tipo y método de medición, fecha, parámetros, altura estimada y notas), y exporta `diameter_cm` como valor numérico y `measurement_height_m` como `1.3`. Diámetros y coordenadas conservan la precisión disponible, sin redondeo ni conversión a cero cuando faltan. Las coordenadas ausentes se representan con celdas vacías. `latitude` y `longitude` se almacenan en grados decimales. La Geolocation API del navegador proporciona coordenadas geográficas WGS 84, pero el modelo no almacena CRS y la aplicación no puede garantizar el datum de coordenadas introducidas manualmente; por tanto, EPSG:4326 es el CRS esperado para coordenadas GPS estándar, no metadato verificado de cada registro.

Para importar los puntos, el usuario guarda la hoja `QGIS_Trunks` como CSV UTF-8 y en QGIS selecciona `longitude` como X y `latitude` como Y. La hoja es plana, no usa fórmulas ni empaqueta varios diámetros en una celda. Los registros sin coordenadas pueden seguir como datos tabulares, pero no forman puntos geográficos. La aplicación no genera CSV y la importación no se ha validado ejecutándola en QGIS.

#### Columnas de `QGIS_Trunks`

| Columna | Contenido |
| --- | --- |
| `tree_id` | ID persistente del registro de inventario (`entry.id`). |
| `trunk_id` | ID persistente del tronco dentro de ese registro. |
| `tree_label` | Nombre/etiqueta introducido por el usuario (`treeId`). |
| `species_ifn_code` | Código IFN numérico, si está disponible. |
| `scientific_name` | Nombre científico de la especie. |
| `common_name` | Nombre común de la especie. |
| `health_status` | Código interno fitosanitario (`good`, `acceptable`, `deficient`, `critical`) o vacío. |
| `measurement_type` | Origen de altura (`manual` o `clinometer`). |
| `measurement_date` | Fecha ISO de la medición. |
| `measurement_method` | Método de distancia (`horizontal`, `slope`) o vacío. |
| `distance_m` | Distancia introducida en metros. |
| `horizontal_distance_m` | Distancia horizontal calculada en metros. |
| `clinometer_percent` | Lectura del clinómetro en porcentaje. |
| `clinometer_angle_deg` | Ángulo del clinómetro en grados. |
| `terrain_slope_percent` | Pendiente del terreno en porcentaje. |
| `terrain_angle_deg` | Ángulo del terreno en grados. |
| `terrain_elevation_difference_m` | Desnivel del terreno en metros. |
| `observer_height_m` | Altura del instrumento/observador en metros. |
| `estimated_height_m` | Altura estimada o introducida del árbol en metros. |
| `notes` | Observaciones del registro. |
| `diameter_cm` | DAP individual del tronco en centímetros, numérico y sin unidad en la celda. |
| `measurement_height_m` | Altura de referencia del DAP en metros (`1.3`). |
| `latitude` | Latitud geográfica en grados decimales; vacío si no existe. |
| `longitude` | Longitud geográfica en grados decimales; vacío si no existe. |

### Testing

Las pruebas se ejecutan con `npm test` (`node --test`) y cubren la validación de diámetros, la edición y visualización del formulario, la persistencia y ambas hojas de exportación.

## 9. Ambigüedades resueltas

La única ambigüedad relevante es si el porcentaje del clinómetro debe interpretarse como tangente o como grado absoluto. La especificación exige que se interprete como tangente y por tanto se convierta a ángulo con `atan`; esa decisión se aplica en toda la implementación y en la documentación.

La convención del desnivel también se define explícitamente: signo positivo = base más alta; signo negativo = base más baja.
