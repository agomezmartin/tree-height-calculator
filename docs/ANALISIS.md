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

### Exportación Excel

Se usará SheetJS en navegador mediante CDN para generar un archivo `.xlsx` sin servidor de aplicación.

### Testing

Se ejecutarán pruebas unitarias del cálculo en Node usando `node --test`, sin depender de DOM ni navegador.

## 9. Ambigüedades resueltas

La única ambigüedad relevante es si el porcentaje del clinómetro debe interpretarse como tangente o como grado absoluto. La especificación exige que se interprete como tangente y por tanto se convierta a ángulo con `atan`; esa decisión se aplica en toda la implementación y en la documentación.

La convención del desnivel también se define explícitamente: signo positivo = base más alta; signo negativo = base más baja.
