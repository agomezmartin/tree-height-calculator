# Metodología matemática

## 1. Interpretación del clinómetro

La lectura del clinómetro en porcentaje no representa directamente un ángulo en grados. La lectura se interpreta como la tangente del ángulo de elevación:

`tan(θ) = P/100`

Por tanto:

`θ = atan(P/100)`

Esto implica que una lectura de `80 %` corresponde a:

`atan(0,80) ≈ 38,66°`

La aplicación usa esta conversión en todas las fases de cálculo para no confundir porcentaje y grados.

## 2. Distancia horizontal

Si la medición se realiza en horizontal, la distancia introducida y la distancia horizontal coinciden:

`D_h = D`

Si la distancia se mide siguiendo la pendiente del terreno, la distancia real sobre el terreno es `D_t` y se proyecta horizontalmente con:

`D_h = D_t × cos(θ_t)`

siendo:

`θ_t = atan(P_t / 100)`

Esto corrige la componente horizontal del segmento inclinado.

## 3. Desnivel del terreno

La inclinación del terreno se interpreta sobre una distancia horizontal. El desnivel de la base respecto al punto del observador es:

`Δh_base = D_h × (P_t / 100)`

Este cálculo conserva el signo:

- `P_t > 0`: la base está más alta.
- `P_t < 0`: la base está más baja.

## 4. Diferencia vertical hasta la copa

La lectura del clinómetro devuelve un porcentaje `P_c` que representa la tangente del ángulo de elevación hacia la copa:

`θ_c = atan(P_c / 100)`

Entonces:

`Δh_copa = D_h × tan(θ_c)

Como `tan(atan(x)) = x`, la diferencia vertical de la copa respecto al plano horizontal del observador se puede escribir directamente como:

`Δh_copa = D_h × (P_c / 100)`

## 5. Altura total del árbol

La altura total del árbol se calcula como:

`H = h_ojo + Δh_copa - Δh_base`

donde:

- `h_ojo` es la altura del instrumento o de los ojos del observador sobre el suelo.
- `Δh_copa` es la diferencia vertical hasta la copa.
- `Δh_base` es el desnivel entre el punto de observación y la base del árbol.

### Significado geométrico

- Si la base está por encima del observador, entonces `Δh_base > 0` y se resta al valor de la copa.
- Si la base está por debajo del observador, entonces `Δh_base < 0` y se suma al valor de la copa.

## 6. Validación de casos

### Terreno plano

`P_t = 0`

`Δh_base = 0`

Por tanto:

`H = h_ojo + D_h × (P_c / 100)`

### Terreno ascendente

`P_t > 0`

`Δh_base > 0`

La altura estimada disminuye respecto al caso plano.

### Terreno descendente

`P_t < 0`

`Δh_base < 0`

La altura estimada aumenta respecto al caso plano.

### Clínómetro positivo

`P_c > 0`

La copa está por encima del plano horizontal del observador.

### Clínómetro negativo

`P_c < 0`

La copa está por debajo del plano horizontal del observador. La aplicación admite el valor siempre que sea numérico, pero debe revisarse el caso de uso porque una lectura negativa normalmente indica una medición fuera del rango habitual para la copa de un árbol.

## 7. Justificación del enfoque adoptado

Se ha optado por separar la geometría en cuatro pasos:

1. distancia horizontal;
2. desnivel de la base;
3. diferencia vertical hasta la copa;
4. corrección por altura del instrumento.

Esto permite:

- comprender mejor la geometría del problema;
- testear cada etapa independientemente;
- auditar la medición en Excel;
- mantener la lógica matemática desacoplada de la interfaz.

## 8. Limitaciones prácticas

- El método no sustituye la orientación profesional del usuario en campo.
- El clinómetro debe usarse con un punto fijo de observación.
- Si el árbol tiene una copa muy inclinada o la base se encuentra muy alejada, la precisión puede variar.
- El cálculo se basa en una aproximación simple de geometría plana.

Aun así, para una aplicación estática de campo y un uso sencillo, este procedimiento es adecuado, transparente y fácilmente auditable.
