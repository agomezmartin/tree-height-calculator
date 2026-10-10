# Calculadora de altura de árboles

Una pequeña aplicación web para calcular la altura de un árbol a partir de mediciones tomadas con un clinómetro, sin necesidad de backend ni base de datos.

## Qué hace la aplicación

- Permite introducir datos de campo: nombre del árbol, fecha, observaciones, distancia, lectura del clinómetro, pendiente del terreno y altura del instrumento.
- Admite dos métodos de distancia: distancia horizontal o distancia medida sobre el terreno.
- Calcula la altura estimada del árbol usando una formulación geométrica clara y separada por fases.
- Guarda mediciones localmente con `localStorage` para editar o revisar datos sin depender de un servidor.
- Exporta los registros a Excel con archivos `.xlsx` para auditoría posterior.
- Captura opcionalmente las coordenadas GPS de cada árbol y las incluye en la exportación; permite elegir mapa estándar, satélite o topográfico y seleccionar la ubicación con un clic o ajustando el marcador.
- Está pensada para funcionar en escritorio, tablet y móvil.
- Incluye una firma discreta con enlace al perfil del desarrollador.
- Permite cambiar la interfaz entre español, inglés, catalán, euskera, gallego y valenciano; el idioma elegido se guarda localmente y también se aplica a la exportación Excel.

## Registrar una altura conocida

Además del cálculo con clinómetro, puedes seleccionar **Introducir altura conocida** y guardar directamente la altura del árbol en metros. Se aceptan punto o coma decimal; el valor debe ser finito y mayor que cero, sin un límite máximo arbitrario. El registro aparece en la misma tabla, identificado por su origen, y se puede editar como cualquier otra medición. En la exportación Excel se conserva la altura como valor numérico y las columnas de medición con clinómetro quedan vacías, ya que no se aplican a este tipo de registro. Los registros antiguos que no tengan un origen guardado siguen considerándose mediciones con clinómetro.

## Idiomas

La aplicación detecta el idioma del navegador al iniciarse y permite elegir español, inglés, catalán, euskera, gallego o valenciano desde el selector de la cabecera. La preferencia se guarda en el navegador. La guía para mantener las traducciones está en [docs/INTERNATIONALIZATION.md](./docs/INTERNATIONALIZATION.md).

## Cómo instalarla

No requiere instalación de dependencias para usar la aplicación en un navegador.

1. Descarga o clona este repositorio.
2. Abre la carpeta del proyecto en un editor.
3. Ejecuta la aplicación desde un servidor local o directamente con GitHub Pages.

## Cómo ejecutarla localmente

Puedes abrir `index.html` directamente en el navegador, o bien arrancar un servidor estático local:

```bash
cd calculadora-arboricultura
python -m http.server 8000
```

Después visita:

```text
http://localhost:8000
```

`localhost` es un contexto seguro reconocido por los navegadores y permite probar la geolocalización. Para probar desde un móvil, utiliza un sitio de pruebas independiente servido mediante HTTPS; no cambies la publicación de GitHub Pages de producción.

## Localización GPS

Al abrir la aplicación, se solicita una captura puntual de GPS para centrar el mapa en tu ubicación; el navegador puede pedir permiso. No se mantiene el GPS activo. Si la captura automática falla, puedes reintentarlo con «Obtener ubicación GPS». El mapa interactivo permite colocar el punto con un clic y ajustarlo arrastrando el marcador. También puedes introducir o corregir manualmente la latitud y la longitud en grados decimales, con punto o coma decimal; el mapa se centra en el punto al confirmar los campos. Si modificas las coordenadas o guardas antes de que termine la captura inicial, la posición automática tardía no sobrescribirá tu selección.

Las coordenadas son opcionales: denegar el permiso, no disponer de señal o usar un navegador sin geolocalización no impide calcular ni guardar una medición. Si se introduce una coordenada, ambas son obligatorias. La latitud debe estar entre -90 y 90 y la longitud entre -180 y 180; `0, 0` es una posición válida. Los registros anteriores, que no incluyen estos campos, siguen siendo compatibles y se exportan con las celdas de ubicación vacías.

La posición representa la ubicación estimada por el dispositivo al capturarla, no una garantía de que sea exactamente la base del árbol. La precisión depende del equipo y de las condiciones de recepción y puede empeorar bajo la cubierta forestal. La aplicación requiere un contexto seguro (HTTPS o `localhost`) y el permiso del usuario. El mapa permite elegir entre cartografía estándar de OpenStreetMap, imágenes satelitales de Esri y mapa topográfico de OpenTopoMap. Leaflet muestra la atribución correspondiente a la capa seleccionada. Estos proveedores reciben solicitudes para las áreas visibles del mapa y pueden inferir aproximadamente la zona consultada. Las coordenadas no se envían como datos de la medición; la carga de teselas puede revelar la zona mostrada. Se necesita conexión a Internet para ver el mapa.

### Comprobación de permisos

En Chrome, abre los controles de información del sitio junto a la dirección y permite la ubicación para el sitio de pruebas. Si ya se denegó, cambia ese permiso y vuelve a cargar la página. La aplicación solicita la ubicación una vez al abrirse y permite repetir la captura con el botón GPS; nunca usa seguimiento continuo. Si se deniega o no hay señal, el mapa y la entrada manual siguen disponibles.

### Prueba segura en móvil

La geolocalización necesita HTTPS en el móvil. Para evitar publicar una rama experimental sobre el sitio de producción, despliega la rama en un sitio GitHub Pages de pruebas separado (por ejemplo, en un repositorio de staging con su propio dominio) o en otro alojamiento HTTPS de pruebas. Este repositorio no configura un despliegue de previsualización: su workflow actual publica desde `main`. No cambies esa configuración ni apuntes Pages a `feature/coordinates-import`. Al terminar la validación, integra los cambios mediante una pull request a `main`; el despliegue de producción seguirá el flujo existente.

## Cómo desplegarla en GitHub Pages

1. Haz push del proyecto a un repositorio de GitHub.
2. En GitHub, entra a `Settings` → `Pages`.
3. Selecciona la rama `main` y la carpeta raíz. Si prefieres un flujo más explícito, puedes usar GitHub Actions con el fichero `.github/workflows/deploy-pages.yml` incluido.
4. Guarda la configuración y espera a que GitHub publique la URL.
5. La aplicación usa rutas relativas para las hojas de estilo y los scripts, por lo que es compatible con GitHub Pages.

### Vista previa al compartir

La página pública de este repositorio-proyecto es `https://agomezmartin.github.io/tree-height-calculator/`. Los metadatos de Open Graph y Twitter están en el HTML inicial de [index.html](./index.html), con esa URL canónica y la ruta absoluta HTTPS de la imagen bajo `/tree-height-calculator/`. El workflow publica la raíz del repositorio sin compilación, por lo que [assets/social-preview.png](./assets/social-preview.png) se incluye directamente en el artefacto. El SVG fuente editable está en [assets/social-preview.svg](./assets/social-preview.svg); ambos archivos tienen una composición de 1200 × 630 píxeles.

Para cambiar la tarjeta, actualiza el título y la descripción de `index.html` (incluidos `og:title`, `og:description`, `twitter:title` y `twitter:description`) y mantén sincronizados `og:url`, `rel="canonical"` y las URLs de imagen. Edita el SVG para modificar el gráfico y vuelve a exportarlo como PNG de 1200 × 630 en `assets/social-preview.png`; por ejemplo, con Inkscape: `inkscape assets/social-preview.svg --export-filename=assets/social-preview.png --export-width=1200 --export-height=630`. Ejecuta `npm test` para comprobar los metadatos, las rutas del subdirectorio, la existencia y las dimensiones de la imagen. No hay un paso de compilación de producción separado.

Los metadatos estáticos están en español porque los rastreadores suelen leer el HTML sin ejecutar JavaScript. La aplicación puede traducir el título y la descripción normales en el navegador, pero la vista previa social seguirá usando el español estático en todos los idiomas.

Después de publicar, comprueba la URL en [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) o [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/); en otros servicios, vuelve a compartir la URL pública tras verificar que la imagen HTTPS ya se puede abrir. WhatsApp, Telegram y otras plataformas pueden conservar las tarjetas en caché, así que el cambio puede tardar o requerir volver a solicitar la inspección. Las pruebas locales no confirman cómo cada plataforma presenta la tarjeta en producción.

## Qué significa la lectura porcentual del clinómetro

Un clinómetro puede dar lecturas en porcentaje porque se está midiendo la tangente del ángulo de elevación:

`tan(θ) = P / 100`

Por tanto:

`θ = atan(P / 100)`

Ejemplo: una lectura de `50 %` significa que la tangente del ángulo es 0,50, es decir, `θ ≈ 26,565°`.

## Diferencia entre distancia horizontal y distancia sobre el terreno

### Distancia horizontal

La distancia introducida coincide con la proyección del segmento sobre la horizontal:

`D_h = D`

### Distancia sobre el terreno

Cuando se mide siguiendo la pendiente del suelo:

`θ_t = atan(P_t / 100)`

`D_h = D_t × cos(θ_t)`

Esta corrección es necesaria para que el cálculo geométrico no sobreestime la distancia real proyectada.

## Fórmulas utilizadas

### 1. Distancia horizontal

`D_h = D` para distancia horizontal.

`D_h = D_t × cos(atan(P_t / 100))` para distancia sobre terreno.

### 2. Desnivel del terreno

`Δh_base = D_h × (P_t / 100)`

- `P_t > 0`: la base del árbol está por encima del observador.
- `P_t < 0`: la base del árbol está por debajo del observador.

### 3. Diferencia vertical hasta la copa

`Δh_copa = D_h × tan(atan(P_c / 100)) = D_h × (P_c / 100)`

### 4. Altura total del árbol

`H = h_ojo + Δh_copa - Δh_base`

donde `h_ojo` es la altura del instrumento o de los ojos del observador sobre el suelo.

## Convenciones de signos

- La pendiente del terreno es positiva cuando la base del árbol está por encima del observador.
- La pendiente del terreno es negativa cuando la base del árbol está por debajo del observador.
- La lectura del clinómetro es positiva cuando la copa está por encima del nivel del ojo del observador.
- La lectura del clinómetro es negativa cuando la copa está por debajo del nivel del ojo.

## Ejemplos de cálculo

### Caso 1: terreno plano

- Distancia horizontal: `20 m`
- Clinómetro: `80 %`
- Pendiente: `0 %`
- Altura del instrumento: `1,70 m`

`H = 1,70 + 20 × 0,80 = 17,70 m`

### Caso 2: terreno ascendente

- Distancia horizontal: `20 m`
- Clinómetro: `80 %`
- Pendiente: `10 %`
- Altura del instrumento: `1,70 m`

`Δh_base = 20 × 0,10 = 2 m`

`H = 1,70 + 16 - 2 = 15,70 m`

## Exportación Excel

La aplicación genera un archivo `.xlsx` con todas las columnas útiles para auditar la medición:

- ID del árbol
- Origen de la altura (clinómetro o altura conocida)
- Fecha
- Observaciones
- Método de medición
- Distancia introducida
- Distancia horizontal calculada
- Clinómetro (%)
- Ángulo del clinómetro en grados
- Pendiente del terreno (%)
- Ángulo del terreno en grados
- Desnivel calculado
- Altura del instrumento
- Altura estimada
- Fórmula / método utilizado

La exportación usa SheetJS en el navegador y no requiere ningún backend.

La tabla de registros muestra las columnas `Latitud` y `Longitud` en grados decimales antes de exportar. La hoja Excel también incluye ambas columnas numéricas y conserva la precisión almacenada; si un registro no tiene ubicación, la tabla muestra `—` y las celdas quedan vacías. Las demás columnas y los registros antiguos se mantienen.

## Limitaciones del método

- El método asume una medición razonablemente aproximada y una visión clara de la copa.
- Si el árbol está muy inclinado o si se observa desde un ángulo muy extremo, el cálculo puede volverse menos fiable.
- Las lecturas del clinómetro deben ser correctas y el usuario debe mantenerse en un punto fijo para evitar errores.

## Precisión esperada

La aplicación mantiene precisión interna y muestra resultados con dos decimales en metros. Las mediciones se redondean únicamente para su presentación, no para los cálculos internos.

## Estructura del proyecto

```text
calculadora-arboricultura/
├── index.html
├── README.md
├── docs/
│   ├── ANALISIS.md
│   └── METODOLOGIA.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   ├── coordinates.js
│   ├── storage.js
│   └── excel.js
├── tests/
│   ├── calculator.test.js
│   ├── coordinates.test.js
│   ├── storage.test.js
│   └── excel.test.js
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── package.json
└── LICENSE
```

## Cómo ejecutar los tests

```bash
npm test
```

Los tests usan el ejecutor integrado `node:test` y mocks de la API GPS, almacenamiento y SheetJS; no requieren un dispositivo con GPS ni permisos reales. Cubren validación y límites de coordenadas, captura y errores, y persistencia/exportación opcionales. No verifican la precisión real del GPS de un dispositivo.

## Consideraciones de accesibilidad y responsive

- Los campos tienen etiquetas y puntos de clic suficientemente grandes.
- El diseño se adapta a móvil, tablet y escritorio.
- Los resultados tienen contraste suficiente y se leen claramente.
- El formulario y la tabla mantienen un flujo simple para uso en campo.
