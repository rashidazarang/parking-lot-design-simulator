# Simulador de Flujo de Estacionamiento

## Descripcion General

El **Simulador de Flujo de Estacionamiento** es una herramienta de modelado basada en simulacion de eventos discretos que permite evaluar el rendimiento de estacionamientos bajo diferentes condiciones de demanda, capacidad y configuracion de salidas.

Utilizando tecnicas de **Monte Carlo** con un generador de numeros aleatorios PCG-64, el simulador ejecuta multiples iteraciones para proporcionar metricas estadisticamente robustas con intervalos de confianza.

---

## Casos de Uso

| Caso de Uso | Descripcion |
|-------------|-------------|
| **Dimensionamiento de capacidad** | Determinar cuantos pisos y espacios se necesitan para una demanda proyectada |
| **Optimizacion de salidas** | Encontrar el numero optimo de canales de salida para evitar colas excesivas |
| **Analisis de horas pico** | Evaluar el impacto de diferentes patrones de demanda en horas pico |
| **Comparacion de escenarios** | Comparar multiples configuraciones lado a lado |
| **Validacion de SLAs** | Verificar si el diseno cumple con los tiempos de espera maximos permitidos |

---

## Variables de Entrada

### 1. Demanda (`demand`)

Controla el patron de llegada de vehiculos al estacionamiento.

| Variable | Unidad | Rango | Descripcion |
|----------|--------|-------|-------------|
| `arrival_rate_per_hour` | vehiculos/hora | > 0 | Tasa promedio de llegadas durante periodos normales (no pico). Valores tipicos: 50-200 |
| `peak_multiplier` | factor | >= 1.0 | Multiplicador aplicado durante horas pico. Un valor de 2.0 significa el doble de llegadas |
| `peak_start_minute` | minutos | >= 0 | Minuto en que inicia el periodo pico (desde el inicio de la simulacion) |
| `peak_duration_minutes` | minutos | > 0 | Duracion del periodo pico. Picos mas largos estresan mas el sistema |

**Ejemplo:**
- `arrival_rate_per_hour: 120` + `peak_multiplier: 1.5` = 180 vehiculos/hora durante el pico

### 2. Capacidad (`capacity`)

Define la capacidad fisica del estacionamiento.

| Variable | Unidad | Rango | Descripcion |
|----------|--------|-------|-------------|
| `floors` | pisos | >= 1 | Numero de niveles del estacionamiento |
| `spots_per_floor` | espacios | >= 1 | Cantidad de espacios por piso |

**Capacidad Total** = `floors` x `spots_per_floor`

**Ejemplo:**
- 4 pisos x 60 espacios = **240 espacios totales**

### 3. Duracion de Estacionamiento (`parking_duration`)

Modela cuanto tiempo permanecen los vehiculos estacionados.

| Variable | Unidad | Opciones/Rango | Descripcion |
|----------|--------|----------------|-------------|
| `mean_minutes` | minutos | > 0 | Tiempo promedio que un vehiculo permanece estacionado |
| `variability` | nivel | LOW, MEDIUM, HIGH | Variabilidad en los tiempos de estancia |

**Niveles de Variabilidad:**

| Nivel | Coeficiente de Variacion (CV) | Comportamiento |
|-------|-------------------------------|----------------|
| `LOW` | 0.3 | Tiempos predecibles, poca dispersion |
| `MEDIUM` | 0.6 | Variacion moderada (caso tipico) |
| `HIGH` | 1.0 | Alta variabilidad, tiempos muy dispares |

> La distribucion utilizada es **Lognormal**, apropiada para tiempos de estancia que son siempre positivos y tipicamente asimetricos.

### 4. Entrada (`entry`)

Configura los puntos de acceso al estacionamiento.

| Variable | Unidad | Rango | Descripcion |
|----------|--------|-------|-------------|
| `channels` | canales | >= 1 | Numero de carriles de entrada paralelos |
| `mean_service_time_seconds` | segundos | > 0 | Tiempo promedio para procesar una entrada (ticket, barrera, etc.) |

**Modelo:** Cola M/M/c (multiples servidores, llegadas Poisson, servicio exponencial)

### 5. Salida (`exit`)

Configura los puntos de salida del estacionamiento.

| Variable | Unidad | Rango | Descripcion |
|----------|--------|-------|-------------|
| `channels` | canales | >= 1 | Numero de carriles de salida paralelos. Mas canales = menos colas |
| `mean_service_time_seconds` | segundos | > 0 | Tiempo promedio para procesar una salida (pago, validacion, barrera) |

> **Nota:** La salida suele ser el cuello de botella principal debido al tiempo de pago.

---

## Configuracion de Simulacion (`config`)

Parametros que controlan la ejecucion del simulador.

| Variable | Unidad | Rango | Default | Descripcion |
|----------|--------|-------|---------|-------------|
| `iterations` | iteraciones | 1-2000 | 100 | Numero de simulaciones Monte Carlo. Mas iteraciones = mayor precision estadistica |
| `master_seed` | entero | cualquiera | 42 | Semilla para reproducibilidad. Misma semilla = mismos resultados |
| `warm_up_minutes` | minutos | >= 0 | 30 | Periodo de calentamiento excluido de las metricas (para alcanzar estado estable) |

### Umbrales de Exito (`thresholds`)

Definen los criterios para determinar si un escenario "pasa" o "falla".

| Variable | Unidad | Rango | Default | Descripcion |
|----------|--------|-------|---------|-------------|
| `rejection_rate` | porcentaje | 0-100% | 5% | Tasa maxima aceptable de vehiculos rechazados por falta de espacio |
| `exit_p95_sla_minutes` | minutos | > 0 | 3.0 | Tiempo maximo de espera en salida para el percentil 95 (SLA) |

---

## Metricas de Salida

### Metricas Principales (Headline)

| Metrica | Descripcion | Criterio de Exito |
|---------|-------------|-------------------|
| **Capacity** | Estado de capacidad: OK si la tasa de rechazo esta bajo el umbral | `rejection_rate <= threshold` |
| **Exit p95** | Tiempo de espera en salida para el 95% de los vehiculos | `p95_minutes <= exit_p95_sla_minutes` |
| **Bottleneck** | Identificacion del cuello de botella del sistema | NONE, ENTRY, EXIT, o BOTH |

### Metricas Detalladas

#### Ocupacion
| Metrica | Descripcion |
|---------|-------------|
| `avg_occupancy_pct` | Porcentaje promedio de ocupacion durante la simulacion |
| `max_occupancy` | Ocupacion maxima alcanzada (numero de vehiculos) |
| `pct_time_full` | Porcentaje del tiempo que el estacionamiento estuvo completamente lleno |

#### Rechazos
| Metrica | Descripcion |
|---------|-------------|
| `rejection_rate` | Proporcion de vehiculos rechazados por falta de espacio |
| `rejection_rate_ci` | Intervalo de confianza 95% para la tasa de rechazo |

#### Espera en Entrada
| Metrica | Descripcion |
|---------|-------------|
| `entry_wait.avg_seconds` | Tiempo promedio de espera en entrada |
| `entry_wait.p95_seconds` | Percentil 95 de espera en entrada |
| `entry_wait.queue_max` | Longitud maxima de cola en entrada |

#### Espera en Salida
| Metrica | Descripcion |
|---------|-------------|
| `exit_wait.avg_minutes` | Tiempo promedio de espera en salida |
| `exit_wait.p90_minutes` | Percentil 90 de espera en salida |
| `exit_wait.p95_minutes` | Percentil 95 de espera en salida (metrica clave de SLA) |
| `exit_wait.p95_ci` | Intervalo de confianza 95% para el p95 de salida |
| `exit_wait.p99_minutes` | Percentil 99 de espera en salida |
| `exit_wait.queue_max` | Longitud maxima de cola en salida |
| `exit_wait.queue_avg` | Longitud promedio de cola en salida |

#### Flujo
| Metrica | Descripcion |
|---------|-------------|
| `throughput_per_hour` | Vehiculos procesados por hora (tasa de salida efectiva) |
| `arrivals_total` | Total de llegadas durante la simulacion |
| `exits_total` | Total de salidas durante la simulacion |

---

## Escenarios

El simulador permite crear y comparar **multiples escenarios** simultaneamente.

### Funciones de Escenarios

| Accion | Descripcion |
|--------|-------------|
| **Agregar (+)** | Crear un nuevo escenario con valores por defecto |
| **Duplicar** | Copiar un escenario existente para hacer variaciones |
| **Renombrar** | Cambiar el nombre del escenario (clic en el nombre) |
| **Eliminar** | Remover un escenario (no se puede eliminar el ultimo) |
| **Run** | Ejecutar simulacion para un escenario individual |
| **Run All** | Ejecutar todos los escenarios en paralelo |

### Tabla de Comparacion

Cuando hay multiples escenarios con resultados, se muestra una tabla comparativa con:
- Columnas ordenables (clic en encabezado)
- Mejores valores resaltados en verde
- Estado PASS/FAIL para cada escenario

---

## Motor de Simulacion

### Especificaciones Tecnicas

| Componente | Tecnologia |
|------------|------------|
| **Tipo** | Simulacion de Eventos Discretos (DES) |
| **Metodo** | Monte Carlo con multiples iteraciones |
| **RNG** | PCG-64 (Permuted Congruential Generator) |
| **Llegadas** | Proceso de Poisson No-Homogeneo |
| **Colas** | Modelo M/M/c |
| **Duracion** | Distribucion Lognormal |
| **Intervalos de Confianza** | Bootstrap (percentil) |

### Reproducibilidad

El simulador garantiza resultados reproducibles mediante:
1. **Master Seed**: Semilla maestra que genera semillas para cada iteracion
2. **PCG-64**: Generador de numeros aleatorios de alta calidad y reproducible
3. **Metadata**: Cada resultado incluye version del motor, semilla y parametros utilizados

---

## Ejemplo de Configuracion Tipica

```json
{
  "scenarios": [{
    "name": "Centro Comercial - Fin de Semana",
    "demand": {
      "arrival_rate_per_hour": 150,
      "peak_multiplier": 2.0,
      "peak_start_minute": 120,
      "peak_duration_minutes": 180
    },
    "capacity": {
      "floors": 5,
      "spots_per_floor": 80
    },
    "parking_duration": {
      "mean_minutes": 120,
      "variability": "HIGH"
    },
    "entry": {
      "channels": 3,
      "mean_service_time_seconds": 8
    },
    "exit": {
      "channels": 4,
      "mean_service_time_seconds": 20
    }
  }],
  "config": {
    "iterations": 200,
    "master_seed": 12345,
    "warm_up_minutes": 30,
    "thresholds": {
      "rejection_rate": 0.02,
      "exit_p95_sla_minutes": 2.5
    }
  }
}
```

---

## Interpretacion de Resultados

### Escenario Exitoso (PASSED)

```
Capacity: OK (0.0% rechazados)
Exit p95: 0.1 min (bajo el SLA de 3 min)
Bottleneck: NONE
```

El diseno cumple con todos los criterios de rendimiento.

### Escenario Fallido (FAILED)

Posibles causas y soluciones:

| Problema | Indicador | Solucion |
|----------|-----------|----------|
| Capacidad insuficiente | `rejection_rate` alto | Aumentar pisos o espacios por piso |
| Cola de salida excesiva | `exit_p95` sobre SLA | Agregar canales de salida o reducir tiempo de servicio |
| Cola de entrada | `entry_wait.p95` alto | Agregar canales de entrada |
| Cuello de botella en entrada | `bottleneck: ENTRY` | Mas canales o servicio mas rapido en entrada |
| Cuello de botella en salida | `bottleneck: EXIT` | Mas canales o servicio mas rapido en salida |

---

## API REST

### Endpoint de Simulacion

```
POST /v1/simulate
Content-Type: application/json
```

### Endpoint de Salud

```
GET /health
```

Respuesta:
```json
{
  "status": "ok",
  "engine_version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Ejecucion Local

```bash
# Instalar dependencias
npm run install:all

# Iniciar servidores (API + Frontend)
npm run dev

# Acceder a la interfaz
# http://localhost:8282
```

---

*Motor de Simulacion v1.0.0 | RNG: PCG-64*
