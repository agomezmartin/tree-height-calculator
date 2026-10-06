# Calculadora de altura de árboles

Una pequeña aplicación web para calcular la altura de un árbol a partir de mediciones tomadas con un clinómetro, sin necesidad de backend ni base de datos.

## Qué hace la aplicación

- Permite introducir datos de campo: nombre del árbol, fecha, observaciones, distancia, lectura del clinómetro, pendiente del terreno y altura del instrumento.
- Admite dos métodos de distancia: distancia horizontal o distancia medida sobre el terreno.
- Calcula la altura estimada del árbol usando una formulación geométrica clara y separada por fases.
- Guarda mediciones localmente con `localStorage` para editar o revisar datos sin depender de un servidor.
- Exporta los registros a Excel con archivos `.xlsx` para auditoría posterior.
- Está pensada para funcionar en escritorio, tablet y móvil.

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

## Cómo desplegarla en GitHub Pages

1. Haz push del proyecto a un repositorio de GitHub.
2. En GitHub, entra a `Settings` → `Pages`.
3. Selecciona la rama `main` y la carpeta raíz. Si prefieres un flujo más explícito, puedes usar GitHub Actions con el fichero `.github/workflows/deploy-pages.yml` incluido.
4. Guarda la configuración y espera a que GitHub publique la URL.
5. La aplicación usa rutas relativas para las hojas de estilo y los scripts, por lo que es compatible con GitHub Pages.

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

## Cómo ejecutar los tests

```bash
npm test
```

## Consideraciones de accesibilidad y responsive

- Los campos tienen etiquetas y puntos de clic suficientemente grandes.
- El diseño se adapta a móvil, tablet y escritorio.
- Los resultados tienen contraste suficiente y se leen claramente.
- El formulario y la tabla mantienen un flujo simple para uso en campo.
