# Diseño — GAMBITO

> **Tema:** recorrido por turnos sobre tablero que se derrumba
> **Estado:** Borrador
> **Fecha:** 2026-11-07
> **Spec:** [01-gambito-core.md](./01-gambito-core.md)

## Concepto

Una ficha recorre un tablero de 8×8 saltando con tres fichas de movimiento, y cada casilla que abandona desaparece para siempre. El jugador recoge valores para sumar puntos y debe decidir hasta cuándo seguir cosechando antes de cruzar la salida hacia un sector más difícil. No hay reloj: se pierde por planificar mal.

## Vínculo con el tema

El derrumbe es la regla central, no un decorado. Cada salto quita una opción del tablero, así que mover es también gastar el futuro. Los turnos cambian la pregunta de «¿llego a tiempo?» a «¿dónde estaré dentro de cinco saltos y con qué fichas podré salir de allí?».

## Bucle de juego

En cada turno, el jugador mira las tres fichas de la mano, elige una y salta a uno de sus destinos resaltados. Debe sopesar tres cosas: el valor de la casilla, si mantiene la cadena y qué opciones deja para el siguiente salto. La casilla abandonada se derrumba, la ficha usada se repone y empieza otro turno.

Cuando la salida se abre, aparece la decisión principal de cada sector: seguir cosechando en un tablero cada vez más roto, o cruzar antes de perder el acceso. El descarte, uno por sector, es el recurso de emergencia, y además tiene un coste doble: corta la cadena y reduce a la mitad el bonus de salida.

## Puntuación y maestría

Cada casilla da su valor por el multiplicador de cadena y por el número de sector. La cadena sube al caer en un valor igual o mayor que el anterior, lo que obliga a subir poco a poco: saltar pronto a un 9 da muchos puntos ahora, pero deja la cadena muy difícil de mantener.

El riesgo que se premia es seguir en el sector con la salida abierta, porque las casillas no recogidas se pierden al cruzar. A la vez, cada sector nuevo multiplica más los puntos. En mi opinión, un buen jugador se distinguirá por tres cosas: planificar varios saltos, ordenar los valores para sostener la cadena y conservar una forma de llegar a la salida. El descarte da además las otras tres fichas exactas, así que quien las recuerde podrá contar con ellas.

## Progresión y duración

Cada sector pide 2 casillas más para abrir la salida y empieza con 2 casillas derrumbadas más. Ambas cosas se estabilizan alrededor del sector 10-11 (30 casillas y 20 huecos), y a partir de ahí solo sigue creciendo el multiplicador de sector. Estimo, sin haberlo probado, que una partida normal durará entre 5 y 15 minutos, con cierta libertad porque el jugador marca el ritmo.

## Aporte al catálogo

Es el primer juego real sin presión de tiempo: BLOCKFALL, ROCAS, RUPTURA y SERPIENTE exigen reflejos, mientras que aquí la marca depende de pensar cada jugada. Además, da a la categoría PUZZLE un segundo juego con una mecánica muy distinta a la de BLOCKFALL, y se puede jugar entero con ratón o con teclado.

## Dirección visual

Tablero oscuro con rejilla cian tenue. Los valores cambian de color por tramos (cian, amarillo y magenta) para localizar las casillas altas de un vistazo. Con una ficha seleccionada, el verde indica que el destino mantiene la cadena y el naranja que la rompe, sin hacer cuentas. Los huecos son casi negros, así que la forma del tablero que queda se lee enseguida.

La ficha es un rombo blanco con glow que muestra el valor a igualar, y la salida pasa de gris con barras a verde pulsante. La portada `cover-gambito` será un damero cian con huecos y un rombo encima. Estos colores son el punto de partida para `/frontend-design`.

## Evaluación

| Criterio                  | Nota (1-5) | Motivo                                                                                       |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Rejugabilidad competitiva | 4          | La decisión de cruzar da margen para mejorar, pero los tableros distintos añaden varianza.   |
| Aporte a la variedad      | 5          | Es el único juego por turnos del catálogo y no depende de los reflejos.                      |
| Encaje técnico            | 5          | Rejilla fija en 800×600, sin física ni assets, y el motor apenas depende del tiempo.         |
| Coste de implementación   | 3          | La física es nula, pero la generación, la bolsa, los dos controles y el panel suman trabajo. |

**Nota final:** 8.5/10 (media de los cuatro × 2, con un decimal). Es una opinión del agente, no un dato. En coste, 5 = barato y 1 = caro.

## Qué validar al probarlo

- **Cruzar o cosechar:** si casi siempre conviene cruzar en cuanto se abre la salida, o agotar el sector, la decisión central no existe. La señal sería que las mejores marcas siguen siempre el mismo patrón.
- **Cadena:** si los jugadores se quedan siempre en x1 o x2, la regla de «igual o mayor» es demasiado dura. Si llegan a x5 sin esfuerzo, no aporta decisión.
- **Muertes por azar:** si muchas partidas terminan con la sensación de que no había nada que hacer, la mano de tres fichas o el único descarte se quedan cortos.
- **Meseta final:** desde el sector 11 ya no aumenta la dificultad. Si un buen jugador puede seguir mucho tiempo sin riesgo, hace falta más presión.
- **Descarte previsible:** comprobar si conocer las otras tres fichas enriquece el juego o lo vuelve mecánico.
- **Legibilidad a 390 px:** si los valores o los patrones no se distinguen, habrá que revisar el tamaño del tablero y de las ranuras.

## Preguntas abiertas

- ¿Conviene una semilla común para que todos jueguen el mismo tablero? Valor fijado en la spec: tablero aleatorio en cada partida.
- ¿Debe el panel mostrar las tres fichas fuera de la mano? Valor fijado en la spec: no se muestran, aunque son las que da el descarte.
- ¿Prefieres que el sector 1 ya tenga 2 casillas derrumbadas? Valor fijado en la spec: 0 en el sector 1 y 2 más por sector, hasta 20.
- ¿Te encaja el tope de casillas para abrir la salida, que no estaba en la idea de partida? Valor fijado en la spec: 30, alcanzado en el sector 10.
- ¿Debe cruzar la salida conservar la cadena? Valor fijado en la spec: vuelve a x1.
